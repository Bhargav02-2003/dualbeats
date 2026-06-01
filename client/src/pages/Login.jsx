import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email))
      errs.email = 'Enter a valid email address.';
    if (!form.password)
      errs.password = 'Password is required.';
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
      await login(form.email.trim().toLowerCase(), form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(err.response?.data?.message || 'Login failed. Please try again.');
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
          <p className="text-text-secondary text-sm mt-1">Welcome back</p>
        </div>

        <div className="auth-card">
          <h2 className="text-xl font-bold text-text-primary mb-6 text-center">Sign In</h2>

          {serverError && (
            <div className="bg-error bg-opacity-10 border border-error border-opacity-30 text-error rounded-xl p-3 mb-5 text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-text-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className={`form-input ${errors.email ? 'border-error' : ''}`}
                autoComplete="email"
                autoFocus
              />
              {errors.email && <p className="text-error text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-text-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className={`form-input pr-10 ${errors.password ? 'border-error' : ''}`}
                  autoComplete="current-password"
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
              id="login-submit-btn"
              type="submit"
              className="btn-primary mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Signing in...
                </>
              ) : (
                'Sign In →'
              )}
            </button>
          </form>

          <p className="text-center text-text-muted text-sm mt-6">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-accentLight hover:text-accent transition-colors font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
