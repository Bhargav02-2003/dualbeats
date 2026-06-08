import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ResetPassword = () => {
  const { resetPassword, forgotPassword } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve email and potential development OTP from state
  const stateEmail = location.state?.email || '';
  const stateOtp = location.state?.otp || '';

  const [email, setEmail] = useState(stateEmail);
  const [otp, setOtp] = useState(stateOtp);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [devOtp, setDevOtp] = useState(stateOtp);

  const validate = () => {
    const errs = {};
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      errs.email = 'Enter a valid email address.';
    }
    if (!otp || otp.trim().length !== 6) {
      errs.otp = 'Enter the 6-digit reset code.';
    }
    if (!newPassword || newPassword.length < 6) {
      errs.newPassword = 'Password must be at least 6 characters.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError('');
    setSuccessMsg('');

    try {
      await resetPassword(email.trim().toLowerCase(), otp.trim(), newPassword);
      setSuccessMsg('Password reset successful! Redirecting to sign in...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Reset password failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setErrors((prev) => ({ ...prev, email: 'Enter a valid email address to request a new code.' }));
      return;
    }

    setResending(true);
    setServerError('');
    setSuccessMsg('');

    try {
      const response = await forgotPassword(email.trim().toLowerCase());
      setSuccessMsg('A new reset code has been sent to your email.');
      if (response?.otp) {
        setDevOtp(response.otp);
        setOtp(response.otp);
      }
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to send reset code.');
    } finally {
      setResending(false);
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white">DualBeats</h1>
          <p className="text-text-muted text-xs font-medium tracking-widest uppercase mt-1">Reset Password</p>
        </div>

        <div className="auth-card">
          <h2 className="text-xl font-bold text-text-primary mb-6 text-center">Set New Password</h2>

          {serverError && (
            <div className="bg-error bg-opacity-10 border border-error border-opacity-30 text-error rounded-xl p-3 mb-5 text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>{serverError}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500 bg-opacity-10 border border-emerald-500 border-opacity-30 text-emerald-400 rounded-xl p-3 mb-5 text-sm flex items-center gap-2">
              <span>✅</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Development / Test helper to show OTP */}
          {devOtp && (
            <div className="bg-accent bg-opacity-10 border border-accent border-opacity-30 text-accent rounded-xl p-3 mb-5 text-xs text-center font-mono">
              Development Mode: Reset code is <strong className="text-white underline">{devOtp}</strong>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email (readonly if passed, editable otherwise) */}
            <div>
              <label htmlFor="reset-email" className="block text-text-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <input
                id="reset-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: '' })); }}
                placeholder="john@example.com"
                className={`form-input ${errors.email ? 'border-error' : ''}`}
                disabled={!!stateEmail}
              />
              {errors.email && <p className="text-error text-xs mt-1">{errors.email}</p>}
            </div>

            {/* OTP Code */}
            <div>
              <label htmlFor="reset-otp" className="block text-text-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
                6-Digit Reset Code
              </label>
              <input
                id="reset-otp"
                name="otp"
                type="text"
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6)); setErrors((prev) => ({ ...prev, otp: '' })); }}
                placeholder="000000"
                maxLength={6}
                className={`form-input text-center text-xl font-bold tracking-widest ${errors.otp ? 'border-error' : ''}`}
              />
              {errors.otp && <p className="text-error text-xs mt-1">{errors.otp}</p>}
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="reset-password" className="block text-text-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
                New Password
              </label>
              <div className="relative">
                <input
                  id="reset-password"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setErrors((prev) => ({ ...prev, newPassword: '' })); }}
                  placeholder="Minimum 6 characters"
                  className={`form-input pr-10 ${errors.newPassword ? 'border-error' : ''}`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors text-lg"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.newPassword && <p className="text-error text-xs mt-1">{errors.newPassword}</p>}
            </div>

            <button
              id="reset-submit-btn"
              type="submit"
              className="btn-primary mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Resetting...
                </>
              ) : (
                'Update Password →'
              )}
            </button>
          </form>

          <div className="flex flex-col items-center gap-3 mt-6">
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-xs text-text-secondary hover:text-accent transition-colors font-semibold uppercase tracking-wider"
            >
              {resending ? 'Sending Code...' : '✉️ Resend Code'}
            </button>

            <p className="text-center text-text-muted text-sm mt-2">
              Back to{' '}
              <Link to="/login" className="text-accent hover:text-accentLight transition-colors font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
