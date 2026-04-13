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

    if (response.ok) {
      console.log("✅ User synced with backend!");
      return true;
    }

    console.error("❌ Failed to sync user with Backend");
    return false;
  } catch (error) {
    console.error("❌ Network error while syncing user:", error.message);
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
      const credential = googleResponse.credential;
      
      // Decode JWT token (base64 decode the payload)
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const decodedToken = JSON.parse(jsonPayload);
      
      const userData = {
        id: decodedToken.sub,
        name: decodedToken.name,
        email: decodedToken.email,
        picture: decodedToken.picture,
        loginTime: new Date().toISOString()
      };

      // 👇 बैकएंड में यूजर डेटा भेजने के लिए
      await syncUserWithBackend(userData);

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
      console.error('❌ Login error:', error);
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
