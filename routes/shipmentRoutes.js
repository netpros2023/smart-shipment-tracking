const express = require("express");
const router = express.Router();

const shipmentController = require("../controllers/shipmentController");
const auth = require("../middleware/authMiddleware"); // JWT AUTH

/* ============================================
   CREATE SHIPMENT (Protected)
============================================ */
router.post("/create-shipment", auth, shipmentController.createShipment);

/* ============================================
   TRACK SHIPMENT (Public)
============================================ */
router.get("/track/:token", shipmentController.trackShipment);

/* ============================================
   GET ALL SHIPMENTS (Admin Dashboard)
============================================ */
router.get("/shipments", shipmentController.getShipments);

/* ============================================
   ADD SHIPMENT EVENT
============================================ */
router.post("/add-event", auth, shipmentController.addShipmentEvent);

/* ============================================
   CARRIER EVENT UPDATE
============================================ */
router.post("/event-update", auth, shipmentController.carrierEventUpdate);

module.exports = router;
