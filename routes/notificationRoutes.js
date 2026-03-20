const express = require("express");
const router = express.Router();
const pool = require("../config/db");

/* ==================================
   CREATE NOTIFICATION
================================== */

router.post("/notifications", async (req, res) => {
  try {
    const { message, shipment_id } = req.body;

    await pool.query(
      "INSERT INTO notifications(message, shipment_id) VALUES($1,$2)",
      [message, shipment_id],
    );

    res.json({
      message: "Notification created",
    });
  } catch (err) {
    console.error("Notification create error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

/* ==================================
   GET NOTIFICATIONS
================================== */

router.get("/notifications", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM notifications ORDER BY created_at DESC",
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Notification fetch error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

/* ==================================
   EXPORT ROUTER
================================== */

module.exports = router;
