const express = require("express");
const router = express.Router();

const shipmentController = require("../controllers/shipmentController");
const auth = require("../middleware/authMiddleware"); // 🔐 JWT AUTH MIDDLEWARE

/* ============================================
   🔹 Create Shipment (Protected API)
============================================ */
router.post("/create-shipment", auth, shipmentController.createShipment);

/* ============================================
   🔹 Track Shipment using Secure Token
   (Public API for customers)
============================================ */
router.get("/track/:token", shipmentController.trackShipment);

/* ============================================
   🔹 Add Shipment Event (Protected API)
============================================ */
router.post("/add-event", auth, shipmentController.addShipmentEvent);

/* ============================================
   🔹 Carrier Event Update (Protected API)
============================================ */
router.post("/event-update", auth, shipmentController.carrierEventUpdate);

module.exports = router;
