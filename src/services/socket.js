import io from "socket.io-client";

const SOCKET_URL = "https://ai-debate-arena-backend-9zur.onrender.com";

export const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling'],
  withCredentials: true,
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true
  }
});

socket.on("connect", () => {
  console.log("✅ Connected to server");
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected from server");
});

socket.on("error", (error) => {
  console.error("🔴 Socket error:", error);
});

export default socket;
