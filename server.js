const express = require("express");
const cors = require("cors");
const http = require("http");
require("dotenv").config();

const pool = require("./config/db");

const shipmentRoutes = require("./routes/shipmentRoutes");
const iotRoutes = require("./routes/iotRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const authRoutes = require("./routes/authRoutes");

const { initSocket } = require("./config/socket");

const app = express();

/* ==============================
   🔹 MIDDLEWARE
============================== */

app.use(cors());
app.use(express.json());

/* ==============================
   🔹 ROUTES
============================== */

// Auth APIs
app.use("/api/auth", authRoutes);

// Shipment APIs
app.use("/api", shipmentRoutes);

// IoT APIs
app.use("/api/iot", iotRoutes);

// Analytics APIs
app.use("/api/analytics", analyticsRoutes);

/* ==============================
   🔹 TEST ROUTES
============================== */

// Server test
app.get("/", (req, res) => {
  res.send("🚀 Backend Server Running");
});

// Database test
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM shipments");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});

/* ==============================
   🔹 HTTP SERVER
============================== */

const server = http.createServer(app);

/* ==============================
   🔹 SOCKET.IO INIT
============================== */

initSocket(server);

/* ==============================
   🔹 START SERVER
============================== */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
