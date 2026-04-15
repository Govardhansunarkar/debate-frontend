import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

const getBackendBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL;

  if (configuredUrl) {
    return configuredUrl.endsWith('/api') ? configuredUrl : `${configuredUrl}/api`;
  }

  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api'
    : 'https://debate-backend-paro.onrender.com/api';
};

const syncUserWithBackend = async (userData) => {
  try {
    const API_URL = `${getBackendBaseUrl()}/users/login`;
    console.log('[Auth] Syncing user to backend:', API_URL, userData.email);
    
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uid: userData.id,
        email: userData.email,
        displayName: userData.name,
        photoURL: userData.picture
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Backend rejected login:", response.status, errorData);
      return false;
    }

    const result = await response.json();
    console.log("✅ User synced with backend!", result.user);
    return true;
  } catch (error) {
    console.error("❌ Network error while syncing user:", error.message);
    console.error("Stack:", error.stack);
    return false;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [googleToken, setGoogleToken] = useState(null);

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const storedUser = localStorage.getItem('authUser');
    const storedToken = localStorage.getItem('googleToken');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setGoogleToken(storedToken);
      console.log('✅ User restored from localStorage:', JSON.parse(storedUser).name);
    }
    setLoading(false);
  }, []);

  const login = async (googleResponse) => {
    try {
      if (!googleResponse || !googleResponse.credential) {
        throw new Error('Invalid Google response: missing credential');
      }

      const credential = googleResponse.credential;
      
      // Validate token format
      const parts = credential.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT token format');
      }
      
      // Decode JWT token (base64 decode the payload)
      const base64Url = parts[1];
      if (!base64Url) {
        throw new Error('Invalid JWT token: missing payload');
      }

      let decodedToken;
      try {
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        decodedToken = JSON.parse(jsonPayload);
      } catch (decodeErr) {
        console.error('[AuthContext] JWT decode error:', decodeErr);
        throw new Error('Failed to decode Google token');
      }

      if (!decodedToken.sub || !decodedToken.email) {
        throw new Error('Google token missing required fields (sub or email)');
      }
      
      const userData = {
        id: decodedToken.sub,
        name: decodedToken.name || 'User',
        email: decodedToken.email,
        picture: decodedToken.picture,
        loginTime: new Date().toISOString()
      };

      // 👇 बैकएंड में यूजर डेटा भेजने के लिए
      const syncSuccess = await syncUserWithBackend(userData);
      if (!syncSuccess) {
        console.warn('[AuthContext] Backend sync failed, but continuing with local auth');
      }

      // Store in localStorage
      localStorage.setItem('authUser', JSON.stringify(userData));
      localStorage.setItem('googleToken', credential);
      localStorage.setItem('userId', decodedToken.sub); // For backend compatibility
      localStorage.setItem('playerName', decodedToken.name); // For existing debate components

      setUser(userData);
      setGoogleToken(credential);
      
      console.log('✅ User logged in:', userData.name);
      return userData;
    } catch (error) {
      console.error('❌ Login error:', error.message);
      throw error;
    }
  };

  const logout = () => {
    // Clear all auth data
    localStorage.removeItem('authUser');
    localStorage.removeItem('googleToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('playerName');
    
    setUser(null);
    setGoogleToken(null);
    console.log('✅ User logged out');
  };

  const value = {
    user,
    googleToken,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
