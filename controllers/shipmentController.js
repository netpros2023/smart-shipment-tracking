const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const { getIO } = require("../config/socket");
const axios = require("axios");

const {
  sendEmail,
  sendSMS,
  sendWhatsApp,
} = require("../services/notificationService");

const { getAlternativeRoute } = require("../services/rerouteService");

/* ============================================
   STATUS NORMALIZATION ENGINE
============================================ */

const normalizeStatus = (carrierStatus) => {
  const statusMap = {
    DLVD: "Delivered",
    ODF: "Out for Delivery",
    INT: "In Transit",
    PKD: "Picked Up",
  };

  return statusMap[carrierStatus] || "In Transit";
};

/* ============================================
   RISK SCORE ENGINE
============================================ */

const calculateRiskScore = (
  delayProbability,
  traffic,
  weather,
  reliability,
) => {
  let score =
    delayProbability * 0.5 + traffic * 5 + weather * 5 + (10 - reliability) * 4;

  if (score > 100) score = 100;

  return Math.round(score);
};

/* ============================================
   CENTRAL EVENT PROCESSING ENGINE
============================================ */

const processEvent = async (shipment, status, location) => {
  await pool.query(
    `INSERT INTO shipment_events (shipment_id,event_type,location)
     VALUES ($1,$2,$3)`,
    [shipment.id, status, location || "Unknown"],
  );

  await pool.query("UPDATE shipments SET status=$1 WHERE id=$2", [
    status,
    shipment.id,
  ]);

  /* ETA Prediction */

  let etaHours = 24;

  try {
    const etaResponse = await axios.post("http://localhost:8000/predict-eta", {
      distance: 200,
      speed: 60,
      traffic: 3,
      weather: 2,
      reliability: 7,
    });

    etaHours = etaResponse.data.predicted_eta_hours;
  } catch (error) {
    console.log("ETA service unavailable");
  }

  const etaDate = new Date();
  etaDate.setHours(etaDate.getHours() + etaHours);

  await pool.query("UPDATE shipments SET eta=$1 WHERE id=$2", [
    etaDate,
    shipment.id,
  ]);

  /* Delay prediction */

  let delayProbability = 30;

  try {
    const delayResponse = await axios.post(
      "http://localhost:8000/predict-delay",
      {
        distance: 200,
        speed: 60,
        traffic: 3,
        weather: 2,
        reliability: 7,
      },
    );

    delayProbability = delayResponse.data.delay_probability_percent;
  } catch (error) {
    console.log("Delay prediction fallback used");
  }

  await pool.query("UPDATE shipments SET delay_probability=$1 WHERE id=$2", [
    delayProbability,
    shipment.id,
  ]);

  const riskScore = calculateRiskScore(delayProbability, 3, 2, 7);

  const isHighRisk = riskScore >= 70;

  await pool.query(
    "UPDATE shipments SET risk_score=$1,is_high_risk=$2 WHERE id=$3",
    [riskScore, isHighRisk, shipment.id],
  );

  if (isHighRisk) {
    const message = `Shipment ${shipment.tracking_id} is high risk (${riskScore})`;

    await pool.query(
      `INSERT INTO notifications
       (shipment_id,type,message)
       VALUES ($1,$2,$3)`,
      [shipment.id, "HIGH_RISK_ALERT", message],
    );

    try {
      await sendEmail(shipment.customer_email, "Shipment Alert", message);
    } catch (err) {
      console.log("Email failed");
    }

    getIO().emit("highRiskShipment", {
      tracking_id: shipment.tracking_id,
      riskScore,
    });
  }

  return {
    etaDate,
    delayProbability,
    riskScore,
  };
};

/* ============================================
   CREATE SHIPMENT
============================================ */

exports.createShipment = async (req, res) => {
  try {
    const { customer_name, customer_email, language } = req.body;

    const tracking_id = "TRK-" + uuidv4().slice(0, 8);
    const secure_token = uuidv4();

    const token_expiry = new Date();
    token_expiry.setHours(token_expiry.getHours() + 48);

    await pool.query(
      `INSERT INTO shipments
       (tracking_id,customer_name,customer_email,language,status,secure_token,token_expiry)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        tracking_id,
        customer_name,
        customer_email,
        language || "EN",
        "Created",
        secure_token,
        token_expiry,
      ],
    );

    res.status(201).json({
      message: "Shipment Created",
      tracking_id,
      trackingLink: `https://smart-shipment-tracking.onrender.com/api/track/${secure_token}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ============================================
   TRACK SHIPMENT
============================================ */

exports.trackShipment = async (req, res) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      "SELECT * FROM shipments WHERE secure_token=$1",
      [token],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Invalid tracking link",
      });
    }

    res.status(200).json({
      shipment: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ============================================
   GET ALL SHIPMENTS
============================================ */

exports.getShipments = async (req, res) => {
  try {
    const shipments = await pool.query(
      "SELECT * FROM shipments ORDER BY id DESC",
    );

    res.status(200).json({
      shipments: shipments.rows,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch shipments",
    });
  }
};

/* ============================================
   ADD EVENT
============================================ */

exports.addShipmentEvent = async (req, res) => {
  try {
    const { tracking_id, event_type, location } = req.body;

    const result = await pool.query(
      "SELECT * FROM shipments WHERE tracking_id=$1",
      [tracking_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Shipment not found",
      });
    }

    const shipment = result.rows[0];

    const output = await processEvent(shipment, event_type, location);

    res.json({
      message: "Event added",
      output,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ============================================
   CARRIER EVENT UPDATE
============================================ */

exports.carrierEventUpdate = async (req, res) => {
  try {
    const { tracking_id, carrier_status, location } = req.body;

    const result = await pool.query(
      "SELECT * FROM shipments WHERE tracking_id=$1",
      [tracking_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Shipment not found",
      });
    }

    const shipment = result.rows[0];

    const status = normalizeStatus(carrier_status);

    const output = await processEvent(shipment, status, location);

    res.json({
      message: "Carrier update processed",
      output,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
