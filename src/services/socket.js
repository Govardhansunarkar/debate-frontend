import io from "socket.io-client";

// Auto-detect server URL - localhost for dev, Render for production
const SOCKET_URL = import.meta.env.MODE === 'development' 
  ? 'http://localhost:8000' 
  : 'https://debate-backend-paro.onrender.com';

console.log('[socket.js] Connecting to:', SOCKET_URL);
console.log('[socket.js] Environment:', import.meta.env.MODE);

export const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 15,  // More attempts
  transports: ['websocket', 'polling'],  // Try WebSocket first, fall back to polling
  withCredentials: true,
  path: '/socket.io/',
  secure: import.meta.env.MODE === 'production',  // Only enforce HTTPS in production
  forceNew: true,  // Force new connection
  timeout: 10000,
  autoConnect: true,
  enablesXDR: true,  // For IE9
});

socket.on("connect", () => {
  console.log("✅ Socket Connected! ID:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("❌ Socket Disconnected. Reason:", reason);
  if (reason === "io server disconnect") {
    // Server disconnected, try to reconnect manually
    setTimeout(() => {
      console.log("🔄 Attempting manual reconnection...");
      socket.connect();
    }, 3000);
  }
});

socket.on("error", (error) => {
  console.error("🔴 Socket Error:", error);
});

socket.on("connect_error", (error) => {
  console.error("🔴 Connection Error:", {
    message: error.message,
    code: error.code,
    type: error.type,
    description: error.description
  });
});

// Add retry logic for failed connections
socket.io.on("reconnect_attempt", () => {
  console.log("🔄 Reconnection attempt...");
});

socket.io.on("reconnect_failed", () => {
  console.error("❌ Failed to reconnect to socket server");
});

export default socket;
