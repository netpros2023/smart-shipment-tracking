const express = require("express");
const cors = require("cors");
const http = require("http");
require("dotenv").config();

const pool = require("./config/db");

/* ROUTES */
const shipmentRoutes = require("./routes/shipmentRoutes");
const iotRoutes = require("./routes/iotRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const carrierRoutes = require("./routes/carrierRoutes");
const authRoutes = require("./routes/authRoutes");
const driverRoutes = require("./routes/driverRoutes");
const podRoutes = require("./routes/podRoutes");

/* SOCKET */
const { initSocket } = require("./config/socket");

const app = express();

/* ==================================
   🔹 MIDDLEWARE
================================== */

app.use(cors());
app.use(express.json());

/* ==================================
   🔹 ROUTES
================================== */

app.use("/shipment", shipmentRoutes);
app.use("/api/iot", iotRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api", notificationRoutes);
app.use("/api", carrierRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/pod", podRoutes);

/* ==================================
   🔹 TEST ROUTES
================================== */

app.get("/", (req, res) => {
  res.send("🚀 Backend Server Running");
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM shipments");

    res.json({
      message: "Database connected",
      data: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Database error",
    });
  }
});

/* ==================================
   🔹 CREATE HTTP SERVER
================================== */

const server = http.createServer(app);

/* ==================================
   🔹 SOCKET INIT
================================== */

initSocket(server);

/* ==================================
   🔹 START SERVER
================================== */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
