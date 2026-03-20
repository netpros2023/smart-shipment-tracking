const express = require("express");
const router = express.Router();
const driverController = require("../controllers/driverController");
const authMiddleware = require("../middleware/authMiddleware");

/* =========================================
   🔹 DRIVER ROUTES (PROTECTED)
========================================= */

router.get("/shipments", authMiddleware, driverController.getAssignedShipments);
router.post("/update-status", authMiddleware, driverController.updateStatus);
router.post("/share-location", authMiddleware, driverController.shareLocation);

module.exports = router;
