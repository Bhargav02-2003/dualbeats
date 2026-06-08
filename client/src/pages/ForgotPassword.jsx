import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ForgotPassword = () => {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address.');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError('');

    try {
      const response = await forgotPassword(email.trim().toLowerCase());
      // Navigate to reset password page with email and potential developer OTP passed in route state
      navigate('/reset-password', {
        state: {
          email: email.trim().toLowerCase(),
          otp: response?.otp // Include dev OTP if returned by server
        }
      });
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to send password reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent rounded-full opacity-[0.06] blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-red-800 rounded-full opacity-[0.06] blur-3xl"></div>
      </div>

      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0zM9 21h6M12 17v4m-8-4v4m16-4v4" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white">DualBeats</h1>
          <p className="text-text-muted text-xs font-medium tracking-widest uppercase mt-1">Reset Account</p>
        </div>

        <div className="auth-card">
          <h2 className="text-xl font-bold text-text-primary mb-4 text-center">Forgot Password</h2>
          <p className="text-text-secondary text-sm text-center mb-6">
            Enter your email address and we'll send you a 6-digit code to reset your password.
          </p>

          {serverError && (
            <div className="bg-error bg-opacity-10 border border-error border-opacity-30 text-error rounded-xl p-3 mb-5 text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="forgot-email" className="block text-text-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); setServerError(''); }}
                placeholder="john@example.com"
                className={`form-input ${error ? 'border-error' : ''}`}
                autoComplete="email"
                autoFocus
              />
              {error && <p className="text-error text-xs mt-1">{error}</p>}
            </div>

            <button
              id="forgot-submit-btn"
              type="submit"
              className="btn-primary mt-4"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Sending Code...
                </>
              ) : (
                'Send Reset Code →'
              )}
            </button>
          </form>

          <p className="text-center text-text-muted text-sm mt-6">
            Remembered your password?{' '}
            <Link to="/login" className="text-accent hover:text-accentLight transition-colors font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
