import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = 'Name must be at least 2 characters.';
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email))
      errs.email = 'Enter a valid email address.';
    if (!form.password || form.password.length < 6)
      errs.password = 'Password must be at least 6 characters.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError('');

    try {
      const response = await register(form.name.trim(), form.email.trim().toLowerCase(), form.password);
      // Pass email and development OTP to OTP page via state
      navigate('/verify-otp', {
        state: {
          email: form.email.trim().toLowerCase(),
          name: form.name.trim(),
          otp: response?.otp
        }
      });
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent rounded-full opacity-5 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accentLight rounded-full opacity-5 blur-3xl"></div>
      </div>

      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎵</div>
          <h1 className="text-3xl font-black gradient-text">DualBeats</h1>
          <p className="text-text-secondary text-sm mt-1">Create your account</p>
        </div>

        <div className="auth-card">
          <h2 className="text-xl font-bold text-text-primary mb-6 text-center">Sign Up</h2>

          {serverError && (
            <div className="bg-error bg-opacity-10 border border-error border-opacity-30 text-error rounded-xl p-3 mb-5 text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="reg-name" className="block text-text-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
                Full Name
              </label>
              <input
                id="reg-name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="John Doe"
                className={`form-input ${errors.name ? 'border-error' : ''}`}
                autoComplete="name"
                autoFocus
              />
              {errors.name && <p className="text-error text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="block text-text-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <input
                id="reg-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className={`form-input ${errors.email ? 'border-error' : ''}`}
                autoComplete="email"
              />
              {errors.email && <p className="text-error text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="block text-text-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  className={`form-input pr-10 ${errors.password ? 'border-error' : ''}`}
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
              {errors.password && <p className="text-error text-xs mt-1">{errors.password}</p>}
            </div>

            <button
              id="register-submit-btn"
              type="submit"
              className="btn-primary mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Sending OTP...
                </>
              ) : (
                'Create Account →'
              )}
            </button>
          </form>

          <p className="text-center text-text-muted text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-accentLight hover:text-accent transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
