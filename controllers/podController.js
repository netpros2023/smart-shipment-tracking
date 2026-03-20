const pool = require("../config/db");

/* =========================================
   🔹 CREATE PROOF OF DELIVERY
========================================= */

exports.createPOD = async (req, res) => {
  const { shipment_id, receiver_name, otp_verified, image_url, latitude, longitude } = req.body;

  try {
    await pool.query("BEGIN");

    // 1. Insert POD
    await pool.query(
      `INSERT INTO proof_of_delivery 
      (shipment_id, receiver_name, otp_verified, image_url, latitude, longitude) 
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [shipment_id, receiver_name, otp_verified, image_url, latitude, longitude]
    );

    // 2. Update Shipment Status to Delivered
    await pool.query(
      "UPDATE shipments SET status = 'Delivered', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [shipment_id]
    );

    // 3. Add to History
    await pool.query(
      "INSERT INTO shipment_status_history (shipment_id, status, description) VALUES ($1, 'Delivered', 'Shipment delivered and POD saved')",
      [shipment_id]
    );

    await pool.query("COMMIT");

    res.json({ message: "Proof of delivery saved successfully" });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("POD creation error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/* =========================================
   🔹 GET POD BY SHIPMENT ID
========================================= */

exports.getPODByShipment = async (req, res) => {
  const { shipment_id } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM proof_of_delivery WHERE shipment_id = $1",
      [shipment_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "POD not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Fetch POD error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
