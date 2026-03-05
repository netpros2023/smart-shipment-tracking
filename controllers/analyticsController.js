const pool = require("../config/db");

/* =========================================
   ON TIME DELIVERY %
========================================= */

exports.getOnTimePercentage = async (req, res) => {
  try {
    const total = await pool.query(
      `SELECT COUNT(*) FROM shipments WHERE status='Delivered'`,
    );

    const onTime = await pool.query(
      `SELECT COUNT(*) 
       FROM shipments 
       WHERE status='Delivered' 
       AND delay_probability < 50`,
    );

    const totalDelivered = parseInt(total.rows[0].count);
    const onTimeDelivered = parseInt(onTime.rows[0].count);

    const percentage =
      totalDelivered === 0 ? 0 : (onTimeDelivered / totalDelivered) * 100;

    res.json({
      totalDelivered,
      onTimeDelivered,
      onTimePercentage: percentage.toFixed(2),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* =========================================
   ETA ACCURACY %
========================================= */

exports.getEtaAccuracy = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT eta, created_at 
       FROM shipments
       WHERE eta IS NOT NULL`,
    );

    let accurate = 0;

    result.rows.forEach((row) => {
      const eta = new Date(row.eta);
      const created = new Date(row.created_at);

      const diffHours = Math.abs(eta - created) / (1000 * 60 * 60);

      if (diffHours <= 2) {
        accurate++;
      }
    });

    const accuracy =
      result.rows.length === 0 ? 0 : (accurate / result.rows.length) * 100;

    res.json({
      shipmentsAnalyzed: result.rows.length,
      etaAccuracy: accuracy.toFixed(2),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* =========================================
   CARRIER PERFORMANCE
========================================= */

exports.getCarrierPerformance = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT carrier, COUNT(*) AS shipments
       FROM shipments
       GROUP BY carrier`,
    );

    res.json({
      carriers: result.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* =========================================
   DELAY HEATMAP DATA
========================================= */

exports.getDelayHeatmap = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT location, COUNT(*) AS delay_count
       FROM shipment_events
       WHERE event_type='Delayed'
       GROUP BY location`,
    );

    res.json({
      heatmap: result.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* =========================================
   RISK DISTRIBUTION
========================================= */

exports.getRiskDistribution = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         CASE
           WHEN risk_score < 30 THEN 'Low Risk'
           WHEN risk_score < 70 THEN 'Medium Risk'
           ELSE 'High Risk'
         END AS risk_level,
         COUNT(*) AS count
       FROM shipments
       GROUP BY risk_level`,
    );

    res.json({
      riskDistribution: result.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
