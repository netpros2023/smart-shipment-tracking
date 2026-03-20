const express = require("express");

const router = express.Router();

const analytics = require("../controllers/analyticsController");

router.get("/summary", analytics.getAnalyticsSummary);
router.get("/carrier-performance", analytics.getCarrierPerformance);
router.get("/delay", analytics.getDelayAnalysis);

module.exports = router;
