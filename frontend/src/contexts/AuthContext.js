// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // This effect runs once on app load to check for an existing token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // If a token exists, we'll assume the user is logged in.
      // We can optionally decode the token here to get user info if needed.
      // For now, a simple object will suffice to indicate an authenticated state.
      setUser({ token });
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      setUser(user); // Set the user state, which will trigger re-renders
      
      return { success: true };
    } catch (error) {
      // Clear any lingering token on failed login
      localStorage.removeItem('token');
      setUser(null);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Erro ao fazer login' 
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      setUser(user); // Set the user state
      
      return { success: true };
    } catch (error) {
      localStorage.removeItem('token');
      setUser(null);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Erro ao fazer cadastro' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null); // Clear the user state
    // Redirect to login page to ensure a clean state
    window.location.href = '/login';
  };

  const value = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isLoading, // Expose isLoading for a better loading experience
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};