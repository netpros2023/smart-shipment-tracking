const express = require("express");

const router = express.Router();

const analytics = require("../controllers/analyticsController");

router.get("/on-time", analytics.getOnTimePercentage);

router.get("/eta-accuracy", analytics.getEtaAccuracy);

router.get("/carrier-performance", analytics.getCarrierPerformance);

router.get("/delay-heatmap", analytics.getDelayHeatmap);

router.get("/risk-distribution", analytics.getRiskDistribution);

module.exports = router;
