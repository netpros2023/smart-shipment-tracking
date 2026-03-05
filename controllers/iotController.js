const pool = require("../config/db");
const { getIO } = require("../config/socket");

/* =========================================
   SENSOR THRESHOLDS
========================================= */

const TEMP_THRESHOLD = 8;
const SHOCK_THRESHOLD = 5;
const ROUTE_DEVIATION_KM = 10;

/* =========================================
   SIMPLE DISTANCE CALCULATION
========================================= */

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/* =========================================
   SENSOR DATA API
========================================= */

exports.receiveSensorData = async (req, res) => {
  try {
    const { tracking_id, temperature, shock, latitude, longitude } = req.body;

    const shipmentResult = await pool.query(
      "SELECT * FROM shipments WHERE tracking_id=$1",
      [tracking_id],
    );

    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({
        message: "Shipment not found",
      });
    }

    const shipment = shipmentResult.rows[0];

    /* ===============================
       SAVE CURRENT LOCATION
    =============================== */

    await pool.query(
      `UPDATE shipments 
       SET current_latitude=$1,
           current_longitude=$2
       WHERE id=$3`,
      [latitude, longitude, shipment.id],
    );

    let alerts = [];

    /* ===============================
       TEMPERATURE CHECK
    =============================== */

    if (temperature > TEMP_THRESHOLD) {
      alerts.push("Temperature exceeded safe limit");

      await pool.query(
        `INSERT INTO notifications
         (shipment_id,type,message,language)
         VALUES ($1,$2,$3,$4)`,
        [
          shipment.id,
          "TEMP_ALERT",
          "Temperature threshold exceeded",
          shipment.language || "EN",
        ],
      );
    }

    /* ===============================
       SHOCK DETECTION
    =============================== */

    if (shock > SHOCK_THRESHOLD) {
      alerts.push("Shock detected");

      await pool.query(
        `INSERT INTO notifications
         (shipment_id,type,message,language)
         VALUES ($1,$2,$3,$4)`,
        [
          shipment.id,
          "SHOCK_ALERT",
          "Shock detected on shipment",
          shipment.language || "EN",
        ],
      );
    }

    /* ===============================
       ROUTE DEVIATION
    =============================== */

    if (shipment.destination_latitude && shipment.destination_longitude) {
      const distance = getDistance(
        latitude,
        longitude,
        shipment.destination_latitude,
        shipment.destination_longitude,
      );

      if (distance > ROUTE_DEVIATION_KM) {
        alerts.push("Route deviation detected");

        await pool.query(
          `INSERT INTO notifications
           (shipment_id,type,message,language)
           VALUES ($1,$2,$3,$4)`,
          [
            shipment.id,
            "ROUTE_DEVIATION",
            "Shipment deviated from expected route",
            shipment.language || "EN",
          ],
        );
      }
    }

    /* ===============================
       REAL TIME SOCKET UPDATE
    =============================== */

    getIO().emit("sensorUpdate", {
      tracking_id,
      temperature,
      shock,
      latitude,
      longitude,
      alerts,
    });

    res.status(200).json({
      message: "Sensor data processed",
      alerts,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
