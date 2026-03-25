import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

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

  const login = (googleResponse) => {
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
