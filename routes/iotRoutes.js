const express = require("express");

const router = express.Router();

const iotController = require("../controllers/iotController");

router.post("/sensor-data", iotController.receiveSensorData);

module.exports = router;
