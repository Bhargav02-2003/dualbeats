import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import api from '../api/axios';

const AuthContext = createContext(null);

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Bare axios instance — no interceptors — used only for the initial auth check
// This prevents the refresh loop on page load when user is not logged in
const rawApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 10000,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true on initial load

  // Fetch the current user on app mount — uses raw API to avoid interceptor loop
  const fetchUser = useCallback(async () => {
    try {
      const { data } = await rawApi.get('/api/auth/me');
      setUser(data.user);
    } catch {
      // 401 here is expected (user not logged in) — silently set user to null
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setUser(null);
    }
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/api/auth/register', { name, email, password });
    return data;
  };

  const verifyOTP = async (email, otp) => {
    const { data } = await api.post('/api/auth/verify-otp', { email, otp });
    setUser(data.user);
    return data;
  };

  const resendOTP = async (email) => {
    const { data } = await api.post('/api/auth/resend-otp', { email });
    return data;
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, register, verifyOTP, resendOTP, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
