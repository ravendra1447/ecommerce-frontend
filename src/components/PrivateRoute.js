import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>;
  }

  if (!user) {
    // Store current location before redirecting to login
    localStorage.setItem('returnUrl', location.pathname + location.search);
    return <Navigate to="/login" />;
  }

  return children;
};

export default PrivateRoute;

