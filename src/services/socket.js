import io from "socket.io-client";

const SOCKET_URL = "https://ai-debate-arena-backend-9zur.onrender.com";

export const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,  // Increased for better reliability
  transports: ['websocket', 'polling'],  // Try WebSocket first, fall back to polling
  withCredentials: true,
  path: '/socket.io/',
  secure: true  // Force HTTPS
});

socket.on("connect", () => {
  console.log("✅ Connected to server");
});

socket.on("disconnect", (reason) => {
  console.log("❌ Disconnected from server:", reason);
});

socket.on("error", (error) => {
  console.error("🔴 Socket error:", error);
});

socket.on("connect_error", (error) => {
  console.error("🔴 Connection error:", error.message);
});

export default socket;
