import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    setUser(response.data.user);
    return response.data;
  };

  const loginMobile = async (phone, mpin, password, fcm_token) => {
    if (!phone) {
      throw new Error('Phone number is required');
    }
    if (!mpin && !password) {
      throw new Error('Either MPIN or Password is required');
    }
    if (mpin && password) {
      throw new Error('Please provide either MPIN or Password, not both');
    }
    if (mpin && (mpin.length < 3 || mpin.length > 6)) {
      throw new Error('MPIN must be 3-6 digits');
    }
    if (password && password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    
    try {
      const response = await api.post('/auth/login-mobile', { phone, mpin, password, fcm_token });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setUser(response.data.user);
      return response.data;
    } catch (error) {
      console.error('Mobile Login Error:', error.response?.data);
      console.error('Request Data:', { phone, mpin: mpin || 'null', password: password || 'null' });
      throw error;
    }
  };

  const register = async (userData) => {
    const response = await api.post('/auth/register', userData);
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    setUser(response.data.user);
    return response.data;
  };

  const registerMobile = async (userData) => {
    const response = await api.post('/auth/register-mobile', userData);
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    setUser(response.data.user);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginMobile, register, registerMobile, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

