const express = require("express");
const router = express.Router();

const shipmentController = require("../controllers/shipmentController");

/* CREATE SHIPMENT */
router.post("/create", shipmentController.createShipment);

/* TRACK SHIPMENT */
router.get("/track/:token", shipmentController.trackShipment);

/* GET ALL SHIPMENTS */
router.get("/shipments", shipmentController.getShipments);

/* GET SHIPMENT LOCATION */
router.get("/location/:tracking_id", shipmentController.getShipmentLocation);

module.exports = router;
