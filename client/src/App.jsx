import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOTP from './pages/VerifyOTP';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';

// Loading screen while checking auth state
const SplashScreen = () => (
  <div className="min-h-screen bg-bg flex items-center justify-center">
    <div className="text-center animate-fade-in">
      <div className="text-4xl font-black gradient-text mb-4">🎵 DualBeats</div>
      <div className="spinner mx-auto"></div>
    </div>
  </div>
);

// Private route — redirects to /login if not authenticated
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <SplashScreen />;
  return user ? children : <Navigate to="/login" replace />;
};

// Public route — redirects to / if already authenticated
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <SplashScreen />;
  return !user ? children : <Navigate to="/" replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route
      path="/"
      element={
        <PrivateRoute>
          <Home />
        </PrivateRoute>
      }
    />
    <Route
      path="/login"
      element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      }
    />
    <Route
      path="/register"
      element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      }
    />
    <Route
      path="/verify-otp"
      element={
        <PublicRoute>
          <VerifyOTP />
        </PublicRoute>
      }
    />
    <Route
      path="/forgot-password"
      element={
        <PublicRoute>
          <ForgotPassword />
        </PublicRoute>
      }
    />
    <Route
      path="/reset-password"
      element={
        <PublicRoute>
          <ResetPassword />
        </PublicRoute>
      }
    />
    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
