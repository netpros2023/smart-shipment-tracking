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
   MULTI LANGUAGE MESSAGE ENGINE
============================================ */

const getMessageTemplate = (language, status, riskScore) => {
  const templates = {
    EN: `Your shipment is currently "${status}". Risk Score: ${riskScore}.`,
    TA: `உங்கள் பார்சல் தற்போது "${status}" நிலையில் உள்ளது. அபாய மதிப்பெண்: ${riskScore}.`,
    HI: `आपका पार्सल अभी "${status}" स्थिति में है। जोखिम स्कोर: ${riskScore}.`,
    TE: `మీ పార్సెల్ ప్రస్తుతం "${status}" స్థితిలో ఉంది. ప్రమాద స్కోర్: ${riskScore}.`,
    KN: `ನಿಮ್ಮ ಪಾರ್ಸೆಲ್ ಈಗ "${status}" ಸ್ಥಿತಿಯಲ್ಲಿ ಇದೆ. ಅಪಾಯ ಅಂಕೆ: ${riskScore}.`,
    ML: `നിങ്ങളുടെ പാർസൽ ഇപ്പോൾ "${status}" നിലയിലാണ്. റിസ്ക് സ്കോർ: ${riskScore}.`,
    MR: `तुमचा पार्सल सध्या "${status}" स्थितीत आहे. जोखीम स्कोर: ${riskScore}.`,
    BN: `আপনার পার্সেল বর্তমানে "${status}" অবস্থায় রয়েছে। ঝুঁকি স্কোর: ${riskScore}.`,
    GU: `તમારું પાર્સલ હાલમાં "${status}" સ્થિતિમાં છે. જોખમ સ્કોર: ${riskScore}.`,
    PA: `ਤੁਹਾਡਾ ਪਾਰਸਲ ਇਸ ਵੇਲੇ "${status}" ਸਥਿਤੀ ਵਿੱਚ ਹੈ। ਜੋਖਮ ਸਕੋਰ: ${riskScore}.`,
    OR: `ଆପଣଙ୍କର ପାର୍ସେଲ୍ ବର୍ତ୍ତମାନ "${status}" ଅବସ୍ଥାରେ ଅଛି। ଝୁମ୍କି ସ୍କୋର: ${riskScore}.`,
    AS: `আপোনাৰ পাৰ্চেল এতিয়া "${status}" অৱস্থাত আছে। ঝুঁকি স্কোৰ: ${riskScore}.`,
    UR: `آپ کا پارسل اس وقت "${status}" حالت میں ہے۔ رسک اسکور: ${riskScore}.`,
  };

  return templates[language] || templates["EN"];
};

/* ============================================
   RISK SCORING ENGINE
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

  /* =========================
     ETA PREDICTION
  ========================= */

  const etaResponse = await axios.post("http://localhost:8000/predict-eta", {
    distance: 200,
    speed: 60,
    traffic: 3,
    weather: 2,
    reliability: 7,
  });

  const etaHours = etaResponse.data.predicted_eta_hours;

  const etaDate = new Date();
  etaDate.setHours(etaDate.getHours() + etaHours);

  await pool.query("UPDATE shipments SET eta=$1 WHERE id=$2", [
    etaDate,
    shipment.id,
  ]);

  /* =========================
     DELAY PREDICTION
  ========================= */

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

  const delayProbability = delayResponse.data.delay_probability_percent;

  await pool.query("UPDATE shipments SET delay_probability=$1 WHERE id=$2", [
    delayProbability,
    shipment.id,
  ]);

  /* =========================
     RISK SCORE
  ========================= */

  const riskScore = calculateRiskScore(delayProbability, 3, 2, 7);

  const isHighRisk = riskScore >= 70;
  const isSevereDelay = delayProbability >= 80;

  await pool.query(
    "UPDATE shipments SET risk_score=$1,is_high_risk=$2 WHERE id=$3",
    [riskScore, isHighRisk, shipment.id],
  );

  /* ============================================
     AUTO REROUTING ENGINE
  ============================================ */

  if (isSevereDelay) {
    try {
      const origin =
        shipment.current_latitude + "," + shipment.current_longitude;

      const destination =
        shipment.destination_latitude + "," + shipment.destination_longitude;

      const newRoute = await getAlternativeRoute(origin, destination);

      if (newRoute) {
        console.log("Alternative route:", newRoute);

        await pool.query(
          `INSERT INTO notifications
           (shipment_id,type,message,language)
           VALUES ($1,$2,$3,$4)`,
          [
            shipment.id,
            "ROUTE_CHANGE",
            `Alternative route suggested: ${newRoute.summary}`,
            shipment.language || "EN",
          ],
        );
      }
    } catch (error) {
      console.log("Reroute error:", error.message);
    }
  }

  /* ============================================
     HIGH RISK NOTIFICATION
  ============================================ */

  if (isHighRisk) {
    const message = getMessageTemplate(
      shipment.language || "EN",
      status,
      riskScore,
    );

    await pool.query(
      `INSERT INTO notifications
       (shipment_id,type,message,language)
       VALUES ($1,$2,$3,$4)`,
      [shipment.id, "HIGH_RISK_ALERT", message, shipment.language || "EN"],
    );

    try {
      await sendEmail(
        shipment.customer_email,
        "High Risk Shipment Alert",
        message,
      );

      await sendSMS("+919999999999", message);

      await sendWhatsApp("+919999999999", message);
    } catch (error) {
      console.log("Notification error:", error.message);
    }

    getIO().emit("highRiskShipment", {
      tracking_id: shipment.tracking_id,
      riskScore,
      message,
    });
  }

  return {
    etaDate,
    delayProbability,
    riskScore,
    isHighRisk,
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
      message: "Shipment Created Successfully",
      tracking_id,
      trackingLink: `http://localhost:5000/track/${secure_token}`,
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
        message: "Invalid Tracking Link",
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
   ADD SHIPMENT EVENT
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
        message: "Shipment Not Found",
      });
    }

    const shipment = result.rows[0];

    const output = await processEvent(shipment, event_type, location);

    res.status(200).json({
      message: "Event Processed Successfully",
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

    if (!tracking_id || !carrier_status) {
      return res.status(400).json({
        message: "tracking_id and carrier_status are required",
      });
    }

    const result = await pool.query(
      "SELECT * FROM shipments WHERE tracking_id=$1",
      [tracking_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Shipment Not Found",
      });
    }

    const shipment = result.rows[0];

    const unifiedStatus = normalizeStatus(carrier_status);

    const output = await processEvent(shipment, unifiedStatus, location);

    res.status(200).json({
      message: "Carrier Event Processed Successfully",
      status: unifiedStatus,
      output,
    });
  } catch (error) {
    console.error("Carrier Event Error:", error);

    res.status(500).json({ error: error.message });
  }
};
