import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const OTP_LENGTH = 6;

const VerifyOTP = () => {
  const { verifyOTP, resendOTP } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email || '';
  const name = location.state?.name || 'User';

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

  // Redirect if no email in state
  useEffect(() => {
    if (!email) navigate('/register', { replace: true });
  }, [email, navigate]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (index, value) => {
    // Only allow single digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError('');

    // Auto-focus next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length > 0) {
      const newDigits = Array(OTP_LENGTH).fill('');
      pasted.split('').forEach((ch, i) => { newDigits[i] = ch; });
      setDigits(newDigits);
      const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otp = digits.join('');
    if (otp.length < OTP_LENGTH) {
      setError('Please enter all 6 digits.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verifyOTP(email, otp);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
      // Clear OTP inputs on error
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setError('');
    setSuccess('');

    try {
      await resendOTP(email);
      setSuccess('A new OTP has been sent to your email.');
      setCountdown(60);
      setCanResend(false);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  if (!email) return null;

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent rounded-full opacity-5 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accentLight rounded-full opacity-5 blur-3xl"></div>
      </div>

      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📧</div>
          <h1 className="text-3xl font-black gradient-text">DualBeats</h1>
          <p className="text-text-secondary text-sm mt-1">Email Verification</p>
        </div>

        <div className="auth-card">
          <h2 className="text-xl font-bold text-text-primary mb-2 text-center">Enter Verification Code</h2>
          <p className="text-text-secondary text-sm text-center mb-6">
            We sent a 6-digit code to{' '}
            <span className="text-accentLight font-medium">{email}</span>
          </p>

          {error && (
            <div className="bg-error bg-opacity-10 border border-error border-opacity-30 text-error rounded-xl p-3 mb-5 text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-success bg-opacity-10 border border-success border-opacity-30 text-success rounded-xl p-3 mb-5 text-sm flex items-center gap-2">
              <span>✅</span>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* OTP Inputs */}
            <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-input-${i}`}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="otp-input"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <button
              id="verify-otp-btn"
              type="submit"
              className="btn-primary"
              disabled={loading || digits.join('').length < OTP_LENGTH}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Verifying...
                </>
              ) : (
                'Verify & Create Account →'
              )}
            </button>
          </form>

          {/* Resend OTP */}
          <div className="mt-5 text-center">
            {canResend ? (
              <button
                id="resend-otp-btn"
                onClick={handleResend}
                disabled={resending}
                className="btn-ghost text-accentLight hover:text-accent"
              >
                {resending ? 'Sending...' : 'Resend OTP'}
              </button>
            ) : (
              <p className="text-text-muted text-sm">
                Resend in{' '}
                <span className="text-accentLight font-semibold">{countdown}s</span>
              </p>
            )}
          </div>

          <p className="text-center text-text-muted text-sm mt-4">
            Wrong email?{' '}
            <Link to="/register" className="text-accentLight hover:text-accent transition-colors font-medium">
              Go back
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
