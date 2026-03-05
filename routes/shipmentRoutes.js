const express = require("express");
const router = express.Router();

const shipmentController = require("../controllers/shipmentController");
const auth = require("../middleware/authMiddleware");

/* CREATE SHIPMENT */
router.post("/create-shipment", auth, shipmentController.createShipment);

/* TRACK SHIPMENT */
router.get("/track/:token", shipmentController.trackShipment);

/* GET ALL SHIPMENTS */
router.get("/shipments", shipmentController.getShipments);

/* ADD EVENT */
router.post("/add-event", auth, shipmentController.addShipmentEvent);

/* CARRIER UPDATE */
router.post("/event-update", auth, shipmentController.carrierEventUpdate);

module.exports = router;
