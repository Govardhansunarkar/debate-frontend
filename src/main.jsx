import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./index.css";

// Get Google Client ID from environment variables
// Production: Set VITE_GOOGLE_CLIENT_ID in Vercel
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Validate Google Client ID
if (!GOOGLE_CLIENT_ID) {
  console.error('%c❌ CRITICAL: VITE_GOOGLE_CLIENT_ID is not set!', 'color: red; font-weight: bold; font-size: 14px;');
  console.warn('%c⚠️ Google OAuth will not work. Set VITE_GOOGLE_CLIENT_ID in your .env file', 'color: orange; font-size: 12px;');
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);