const { Server } = require("socket.io");

let io;

/* ==============================
   🔹 Initialize Socket.io
============================== */

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 Client Connected:", socket.id);

    /* ==============================
       Shipment Status Updates
    =============================== */

    socket.on("shipmentUpdate", (data) => {
      console.log("📦 Shipment Update:", data);
    });

    /* ==============================
       IoT Location Updates
    =============================== */

    socket.on("locationUpdate", (data) => {
      console.log("📍 Location Update:", data);
    });

    /* ==============================
       Client Disconnect
    =============================== */

    socket.on("disconnect", () => {
      console.log("❌ Client Disconnected:", socket.id);
    });
  });

  return io;
};

/* ==============================
   🔹 Get Socket Instance
============================== */

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized! Call initSocket first.");
  }

  return io;
};

module.exports = {
  initSocket,
  getIO,
};
