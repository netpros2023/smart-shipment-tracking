const express = require("express");
const router = express.Router();
const podController = require("../controllers/podController");
const authMiddleware = require("../middleware/authMiddleware");

/* =========================================
   🔹 POD ROUTES (PROTECTED)
========================================= */

router.post("/proof-of-delivery", authMiddleware, podController.createPOD);
router.get("/proof-of-delivery/:shipment_id", authMiddleware, podController.getPODByShipment);

module.exports = router;
