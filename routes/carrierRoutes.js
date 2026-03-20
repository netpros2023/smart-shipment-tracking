const express = require("express");
const router = express.Router();
const pool = require("../config/db");

/* ==================================
   ADD CARRIER
================================== */
router.post("/carriers", async (req, res) => {
  try {
    const { name, code, reliability_score } = req.body;

    await pool.query(
      "INSERT INTO carriers (name, code, reliability_score) VALUES ($1,$2,$3)",
      [name, code, reliability_score],
    );

    res.json({
      message: "Carrier added successfully",
    });
  } catch (err) {
    console.error("Add carrier error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

/* ==================================
   GET ALL CARRIERS
================================== */
router.get("/carriers", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM carriers ORDER BY id DESC");

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch carriers error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

/* ==================================
   DELETE CARRIER
================================== */
router.delete("/carriers/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM carriers WHERE id = $1", [id]);

    res.json({
      message: "Carrier deleted successfully",
    });
  } catch (err) {
    console.error("Delete carrier error:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

/* ==================================
   EXPORT ROUTER
================================== */
module.exports = router;
