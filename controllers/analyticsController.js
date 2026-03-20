const pool = require("../config/db");

/* =========================================
   🔹 GET ANALYTICS SUMMARY
========================================= */

exports.getAnalyticsSummary = async (req, res) => {
  try {
    const total = await pool.query("SELECT COUNT(*) FROM shipments");
    const delivered = await pool.query("SELECT COUNT(*) FROM shipments WHERE status = 'Delivered'");
    const delayed = await pool.query("SELECT COUNT(*) FROM shipments WHERE status = 'Delayed'");
    const pending = await pool.query("SELECT COUNT(*) FROM shipments WHERE status = 'Pending'");

    const totalCount = parseInt(total.rows[0].count) || 0;
    const deliveredCount = parseInt(delivered.rows[0].count) || 0;
    const delayedCount = parseInt(delayed.rows[0].count) || 0;
    const onTimePercentage = totalCount === 0 ? 0 : ((deliveredCount / totalCount) * 100).toFixed(2);

    res.json({
      totalShipments: totalCount,
      deliveredShipments: deliveredCount,
      delayedShipments: delayedCount,
      pendingShipments: parseInt(pending.rows[0].count) || 0,
      onTimePercentage: parseFloat(onTimePercentage)
    });
  } catch (error) {
    console.error("Summary analytics error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/* =========================================
   🔹 CARRIER PERFORMANCE
========================================= */

exports.getCarrierPerformance = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.name, COUNT(s.id) as total_shipments, 
             SUM(CASE WHEN s.status = 'Delivered' THEN 1 ELSE 0 END) as delivered
      FROM carriers c
      LEFT JOIN shipments s ON c.id = s.carrier_id
      GROUP BY c.name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Carrier performance analytics error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/* =========================================
   🔹 DELAY ANALYSIS
========================================= */

exports.getDelayAnalysis = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM shipment_status_history 
      WHERE status LIKE '%Delayed%' 
      GROUP BY status
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Delay analysis error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
