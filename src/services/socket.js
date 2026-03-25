import io from "socket.io-client";

// Auto-detect server URL - localhost for dev, Render for production
const SOCKET_URL = import.meta.env.MODE === 'development' 
  ? 'http://localhost:8000' 
  : 'https://debate-backend-paro.onrender.com';

console.log('[socket.js] Connecting to:', SOCKET_URL);
console.log('[socket.js] Environment:', import.meta.env.MODE);

export const socket = io(SOCKET_URL, {
  // Reconnection settings - aggressive for Render free tier
  reconnection: true,
  reconnectionDelay: 2000,           // Wait 2s before first retry
  reconnectionDelayMax: 30000,       // Max 30s between retries
  reconnectionAttempts: 50,          // Try many times (2.5-3 min total)
  
  // Transport settings
  transports: ['websocket', 'polling'],  // Try WebSocket first, then polling
  
  // Security & Headers
  withCredentials: true,
  secure: window.location.protocol === 'https:', // Auto-detect HTTPS
  
  // Timeout settings
  timeout: 40000,                    // 40 seconds before timeout
  connectTimeout: 40000,             // 40 seconds for initial connection
  
  // Other
  path: '/socket.io/',
  autoConnect: true,
  enablesXDR: true,
  
  // Always use direct connection (avoid forcing new each time)
  forceNew: false
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
