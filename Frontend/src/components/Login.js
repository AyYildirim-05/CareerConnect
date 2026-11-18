
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setServerError(
        err.error || err.message || 'Invalid email or password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrors({});
    setServerError('');
  };

  return (
    <main className="cc-login-page">
      <section
        className="cc-login-card"
        aria-labelledby="login-title"
      >
        <div className="cc-login-header">
          <div className="cc-login-icon" aria-hidden="true">
            CC
          </div>

          <h1 id="login-title">Welcome back</h1>
          <p>Sign in to access your CareerConnect account.</p>
        </div>

        {serverError && (
          <div className="cc-login-alert" role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="cc-login-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? 'login-email-error' : undefined
              }
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors(prev => ({ ...prev, email: '' }));
              }}
            />
            {errors.email && (
              <p
                id="login-email-error"
                className="cc-login-error"
                role="alert"
              >
                {errors.email}
              </p>
            )}
          </div>

          <div className="cc-login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password
                  ? 'login-password-error'
                  : undefined
              }
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors(prev => ({ ...prev, password: '' }));
              }}
            />
            {errors.password && (
              <p
                id="login-password-error"
                className="cc-login-error"
                role="alert"
              >
                {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="cc-login-submit"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="cc-login-demo">
          <p>Test Accounts</p>
          <div className="cc-login-demo-actions">
            <button
              type="button"
              onClick={() =>
                fillDemoAccount(
                  'seeker@example.com',
                  'Password123!'
                )
              }
            >
              Seeker Demo
            </button>

            <button
              type="button"
              onClick={() =>
                fillDemoAccount(
                  'recruiter@company.com',
                  'RecruiterPassword123!'
                )
              }
            >
              Recruiter Demo
            </button>
          </div>
        </div>

        <p className="cc-login-register">
          Don't have an account?{' '}
          <Link to="/register">Sign Up</Link>
        </p>
      </section>
    </main>
  );
}
