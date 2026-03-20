const pool = require("../config/db");
const { getIO } = require("../config/socket");

/* =========================================
   🔹 GET ASSIGNED SHIPMENTS
========================================= */

exports.getAssignedShipments = async (req, res) => {
  const driverId = req.user.id; // or from parameters if admin

  try {
    const result = await pool.query(
      `SELECT * FROM shipments WHERE assigned_driver_id = (SELECT id FROM drivers WHERE user_id = $1)`,
      [driverId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Fetch assigned shipments error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/* =========================================
   🔹 UPDATE SHIPMENT STATUS
========================================= */

exports.updateStatus = async (req, res) => {
  const { shipment_id, status, description, latitude, longitude } = req.body;
  const userId = req.user.id;

  try {
    await pool.query("BEGIN");

    // 1. Update Shipment Table
    await pool.query(
      "UPDATE shipments SET status = $1, current_latitude = $2, current_longitude = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4",
      [status, latitude, longitude, shipment_id]
    );

    // 2. Add to History
    await pool.query(
      "INSERT INTO shipment_status_history (shipment_id, status, description, updated_by) VALUES ($1, $2, $3, $4)",
      [shipment_id, status, description, userId]
    );

    // 3. Add to Locations if coordinates provided
    if (latitude && longitude) {
      await pool.query(
        "INSERT INTO shipment_locations (shipment_id, latitude, longitude) VALUES ($1, $2, $3)",
        [shipment_id, latitude, longitude]
      );
    }

    await pool.query("COMMIT");

    // Real-time update via Socket
    const io = getIO();
    io.emit("shipmentUpdate", { shipment_id, status, latitude, longitude });

    res.json({ message: "Status updated successfully" });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Update status error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/* =========================================
   🔹 SHARE LOCATION
========================================= */

exports.shareLocation = async (req, res) => {
  const { shipment_id, latitude, longitude } = req.body;

  try {
    await pool.query(
      "UPDATE shipments SET current_latitude = $1, current_longitude = $2 WHERE id = $3",
      [latitude, longitude, shipment_id]
    );

    await pool.query(
      "INSERT INTO shipment_locations (shipment_id, latitude, longitude) VALUES ($1, $2, $3)",
      [shipment_id, latitude, longitude]
    );

    // Real-time update via Socket
    const io = getIO();
    io.emit("locationUpdate", { shipment_id, latitude, longitude });

    res.json({ message: "Location shared" });
  } catch (error) {
    console.error("Share location error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
