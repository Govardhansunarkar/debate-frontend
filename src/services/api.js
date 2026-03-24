// Use localhost for development, production URL for production
const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001/api'
  : 'https://debate-backend-paro.onrender.com/api';

console.log('[api] Using BASE_URL:', BASE_URL);

// Room APIs
export const createRoom = async (topic, playerName, roomType = 'user-only') => {
  const res = await fetch(`${BASE_URL}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, playerName, roomType })
  });
  return res.json();
};

export const getAvailableRooms = async () => {
  const res = await fetch(`${BASE_URL}/rooms`);
  return res.json();
};

export const getRoomByCode = async (roomCode) => {
  const res = await fetch(`${BASE_URL}/rooms/${roomCode}`);
  return res.json();
};

export const joinRoom = async (roomCode, userId, playerName) => {
  const res = await fetch(`${BASE_URL}/rooms/${roomCode}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, playerName })
  });
  return res.json();
};

export const leaveRoom = async (roomCode, userId) => {
  const res = await fetch(`${BASE_URL}/rooms/${roomCode}/leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId })
  });
  return res.json();
};

// Debate APIs
export const startDebate = async (roomCode, topic, players) => {
  const res = await fetch(`${BASE_URL}/debates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomCode, topic, players })
  });
  return res.json();
};

export const getDebate = async (debateId) => {
  try {
    // Skip API calls for local debates (timestamp-based IDs)
    if (debateId && debateId.startsWith('debate_')) {
      console.debug(`[api] Debate ${debateId} is a local debate - skipping backend fetch`);
      return null;
    }
    
    const res = await fetch(`${BASE_URL}/debates/${debateId}`);
    if (!res.ok) {
      console.debug(`[api] Debate ${debateId} not found in backend`);
      return null;
    }
    return res.json();
  } catch (error) {
    console.debug('[api] getDebate error:', error.message);
    return null;
  }
};

export const endDebate = async (debateId) => {
  try {
    // Skip API calls for local debates (timestamp-based IDs)
    if (debateId && debateId.startsWith('debate_')) {
      console.debug(`[api] Debate ${debateId} is a local debate - skipping backend call`);
      return null;
    }
    
    const res = await fetch(`${BASE_URL}/debates/${debateId}/end`, {
      method: "POST"
    });
    if (!res.ok) {
      console.debug(`[api] Debate ${debateId} not found in backend`);
      return null;
    }
    return res.json();
  } catch (error) {
    console.debug('[api] endDebate error:', error.message);
    return null;
  }
};

export const getDebateResults = async (debateId) => {
  try {
    // Skip API calls for local debates (timestamp-based IDs)
    if (debateId && debateId.startsWith('debate_')) {
      console.debug(`[api] Debate ${debateId} is a local debate - skipping backend fetch`);
      return null;
    }
    
    const res = await fetch(`${BASE_URL}/debates/${debateId}/results`);
    if (!res.ok) {
      console.debug(`[api] Results for debate ${debateId} not found in backend`);
      return null;
    }
    return res.json();
  } catch (error) {
    console.debug('[api] getDebateResults error:', error.message);
    return null;
  }
};

export const getAIFeedback = async (debateId) => {
  try {
    // Skip API calls for local debates (timestamp-based IDs)
    if (debateId && debateId.startsWith('debate_')) {
      console.debug(`[api] Debate ${debateId} is a local debate - skipping backend call`);
      return null;
    }
    
    const res = await fetch(`${BASE_URL}/debates/${debateId}/ai-feedback`, {
      method: "POST"
    });
    if (!res.ok) {
      console.debug(`[api] AI feedback for debate ${debateId} not found`);
      return null;
    }
    return res.json();
  } catch (error) {
    console.debug('[api] getAIFeedback error:', error.message);
    return null;
  }
};

// User APIs
export const createUser = async (name) => {
  const res = await fetch(`${BASE_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  return res.json();
};

export const getUser = async (userId) => {
  const res = await fetch(`${BASE_URL}/users/${userId}`);
  return res.json();
};

export const getUserHistory = async (userId) => {
  const res = await fetch(`${BASE_URL}/users/${userId}/history`);
  return res.json();
};

// Validate debate topic
export const validateTopic = async (topic) => {
  try {
    const res = await fetch(`${BASE_URL}/debates/validate-topic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic })
    });
    return res.json();
  } catch (error) {
    console.error('[api] validateTopic error:', error.message);
    return {
      success: false,
      error: error.message,
      isValid: false
    };
  }
};

// Default export - object with all API functions for backward compatibility
export default {
  createRoom,
  getAvailableRooms,
  getRoomByCode,
  joinRoom,
  leaveRoom,
  startDebate,
  getDebate,
  endDebate,
  getDebateResults,
  getAIFeedback,
  createUser,
  getUser,
  getUserHistory,
  validateTopic,  // NEW: Topic validation
  // Add axios-like methods for services that use them
  post: async (url, data) => {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }
    return { data: await res.json() };
  },
  get: async (url) => {
    const res = await fetch(`${BASE_URL}${url}`);
    if (!res.ok) {
      console.debug(`[api] GET ${url} returned ${res.status}`);
      return { data: null };
    }
    return { data: await res.json() };
  }
};