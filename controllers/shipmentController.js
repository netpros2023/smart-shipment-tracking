const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const { getIO } = require("../config/socket");

const {
  sendEmail,
  sendSMS,
  sendWhatsApp,
} = require("../services/notificationService");

const calculateRisk = require("../utils/riskCalculator");

/* =========================================
MULTI LANGUAGE MESSAGE ENGINE
========================================= */

const getMessage = (language, type, trackingId, riskScore) => {
  const lang = (language || "EN").toUpperCase();

  const messages = {
    EN: {
      HIGH_RISK: `Shipment ${trackingId} is high risk (${riskScore})`,
      CREATED: `Your shipment ${trackingId} has been created`,
    },
  };

  return messages[lang]?.[type] || messages["EN"][type];
};

/* =========================================
CREATE SHIPMENT
========================================= */

exports.createShipment = async (req, res) => {
  try {
    const { 
      customer_name, customer_email, language, sender, receiver, carrier, 
      weight, pickup_address, delivery_address, description,
      pickup_lat, pickup_lng, delivery_lat, delivery_lng,
      package_type, priority, shipping_cost, sms_notif, email_notif,
      sender_phone, receiver_phone
    } = req.body;

    const tracking_id = "TRK-" + uuidv4().slice(0, 8);
    const secure_token = uuidv4();

    const token_expiry = new Date();
    token_expiry.setHours(token_expiry.getHours() + 48);
    
    // Dynamic ETA based on Priority
    const eta_date = new Date();
    if (priority === 'Urgent') {
      eta_date.setDate(eta_date.getDate() + 1);
    } else if (priority === 'Express') {
      eta_date.setDate(eta_date.getDate() + 2);
    } else {
      eta_date.setDate(eta_date.getDate() + 4);
    }

    const lang = (language || "EN").toUpperCase();

    await pool.query(
      `INSERT INTO shipments
      (tracking_id, customer_name, customer_email, language, status, secure_token, token_expiry, 
       sender, receiver, carrier, weight, pickup_address, delivery_address, description, eta_date,
       pickup_lat, pickup_lng, delivery_lat, delivery_lng, package_type, priority, shipping_cost, sms_notif, email_notif,
       sender_phone, receiver_phone)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)`,
      [
        tracking_id,
        customer_name || receiver,
        customer_email || null,
        lang,
        "Shipment Created",
        secure_token,
        token_expiry,
        sender,
        receiver,
        carrier,
        weight || null,
        pickup_address,
        delivery_address,
        description,
        eta_date,
        pickup_lat || null,
        pickup_lng || null,
        delivery_lat || null,
        delivery_lng || null,
        package_type || 'Standard',
        priority || 'Standard',
        shipping_cost || 0,
        sms_notif || false,
        email_notif || false,
        sender_phone || null,
        receiver_phone || null
      ],
    );

    const message = getMessage(lang, "CREATED", tracking_id);

    // Insert notification
    await pool.query(
      "INSERT INTO notifications (message, shipment_id, type) VALUES ($1, $2, $3)",
      [message, tracking_id, 'info']
    );

    res.status(201).json({
      message,
      tracking_id,
      tracking_link: `http://localhost:3000/track/${secure_token}`,
    });
  } catch (error) {
    console.error("Create Shipment Error:", error);
    res.status(500).json({ error: error.message });
  }
};

/* =========================================
TRACK SHIPMENT
========================================= */

exports.trackShipment = async (req, res) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      `SELECT 
        tracking_id,
        customer_name,
        status,
        language,
        created_at,
        current_latitude,
        current_longitude,
        pickup_lat,
        pickup_lng,
        delivery_lat,
        delivery_lng,
        sender,
        receiver,
        carrier,
        weight,
        pickup_address,
        delivery_address,
        description,
        eta_date,
        sender_phone,
        receiver_phone
       FROM shipments
       WHERE tracking_id = $1
       OR secure_token = $1`,
      [token],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Shipment not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Track Shipment Error:", error);
    res.status(500).json({ error: error.message });
  }
};

/* =========================================
GET ALL SHIPMENTS
========================================= */

exports.getShipments = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
      id,
      tracking_id AS "trackingId",
      customer_name AS "customerName",
      customer_email AS "customerEmail",
      language,
      status,
      created_at AS "createdAt",
      sender,
      receiver,
      carrier,
      weight,
      pickup_address AS "pickupAddress",
      delivery_address AS "deliveryAddress",
      description,
      eta_date AS "etaDate",
      sender_phone AS "senderPhone",
      receiver_phone AS "receiverPhone"
      FROM shipments
      ORDER BY created_at DESC
    `);

    res.json({
      shipments: result.rows,
    });
  } catch (error) {
    console.error("Shipment fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch shipments",
    });
  }
};

/* =========================================
ADD EVENT
========================================= */

exports.addShipmentEvent = async (req, res) => {
  try {
    const { tracking_id, status, location } = req.body;

    const shipment = await pool.query(
      "SELECT * FROM shipments WHERE tracking_id=$1",
      [tracking_id],
    );

    if (shipment.rows.length === 0) {
      return res.status(404).json({
        message: "Shipment not found",
      });
    }

    const shipmentData = shipment.rows[0];

    const event = await pool.query(
      `INSERT INTO shipment_events
      (shipment_id,status,location)
      VALUES ($1,$2,$3)
      RETURNING *`,
      [shipmentData.id, status, location],
    );

    res.json({
      message: "Event added",
      event: event.rows[0],
    });
  } catch (error) {
    console.error("Add Event Error:", error);
    res.status(500).json({
      error: error.message,
    });
  }
};

/* =========================================
GET SHIPMENT EVENTS
========================================= */

exports.getShipmentEvents = async (req, res) => {
  try {
    const { tracking_id } = req.params;

    const result = await pool.query(
      `
      SELECT 
      e.id,
      s.tracking_id,
      e.status,
      e.location,
      e.created_at
      FROM shipment_events e
      JOIN shipments s ON e.shipment_id = s.id
      WHERE s.tracking_id = $1
      ORDER BY e.created_at ASC
      `,
      [tracking_id],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get Events Error:", error);
    res.status(500).json({
      error: error.message,
    });
  }
};

/* =========================================
CARRIER EVENT UPDATE
========================================= */

exports.carrierEventUpdate = async (req, res) => {
  try {
    const { tracking_id, carrier_status } = req.body;

    await pool.query("UPDATE shipments SET status=$1 WHERE tracking_id=$2", [
      carrier_status,
      tracking_id,
    ]);

    res.json({
      message: "Carrier update processed",
      status: carrier_status,
    });
  } catch (error) {
    console.error("Carrier Update Error:", error);
    res.status(500).json({
      error: error.message,
    });
  }
};

/* =========================================
GET SHIPMENT LOCATION (POLLING)
========================================= */

exports.getShipmentLocation = async (req, res) => {
  try {
    const { tracking_id } = req.params;

    const result = await pool.query(
      `SELECT current_latitude, current_longitude, pickup_lat, pickup_lng, delivery_lat, delivery_lng, status FROM shipments WHERE tracking_id = $1`,
      [tracking_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Get Location Error:", error);
    res.status(500).json({ error: error.message });
  }
};
