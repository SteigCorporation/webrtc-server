// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Ubah ke domainmu jika sudah online
    methods: ["GET", "POST"]
  }
});

const meetings = {}; // Simpan pengguna per meeting

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", ({ meetingId, userId }) => {
    socket.join(meetingId);
    console.log(`User ${userId} joined room ${meetingId}`);

    // Simpan peserta ke meeting
    if (!meetings[meetingId]) meetings[meetingId] = [];
    meetings[meetingId].push(socket.id);

    // Beri tahu peserta lain di room
    socket.to(meetingId).emit("user-joined", socket.id);

    // Kirim semua peserta yang sudah ada ke user baru
    const otherUsers = meetings[meetingId].filter(id => id !== socket.id);
    socket.emit("all-users", otherUsers);

    // Terima dan broadcast signal ke peserta tujuan
    socket.on("sending-signal", payload => {
      io.to(payload.userToSignal).emit("user-joined-signal", {
        signal: payload.signal,
        callerId: socket.id
      });
    });

    socket.on("returning-signal", payload => {
      io.to(payload.callerId).emit("receiving-returned-signal", {
        signal: payload.signal,
        id: socket.id
      });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      if (meetings[meetingId]) {
        meetings[meetingId] = meetings[meetingId].filter(id => id !== socket.id);
        socket.to(meetingId).emit("user-left", socket.id);
        if (meetings[meetingId].length === 0) delete meetings[meetingId];
      }
    });
  });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Socket.IO server running on port ${PORT}`));
