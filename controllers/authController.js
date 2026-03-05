const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM admin_users WHERE email=$1",
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email" });
    }

    const admin = result.rows[0];

    const valid = await bcrypt.compare(password, admin.password);

    if (!valid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
