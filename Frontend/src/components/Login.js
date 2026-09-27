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
      setServerError(err.error || err.message || 'Invalid email or password.');
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
    <div>
      <h2>Log In</h2>
      <p>Sign in to access your account</p>

      {serverError && <p style={{ color: 'red' }}>{serverError}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="email">Email Address:</label><br />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && <p style={{ color: 'red' }}>{errors.email}</p>}
        </div>
        <br />

        <div>
          <label htmlFor="password">Password:</label><br />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && <p style={{ color: 'red' }}>{errors.password}</p>}
        </div>
        <br />

        <button type="submit" disabled={loading}>
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>
      <br />

      <div>
        <small>Test Accounts:</small><br />
        <button
          type="button"
          onClick={() => fillDemoAccount('seeker@example.com', 'Password123!')}
        >
          Seeker Demo
        </button>
        {' '}
        <button
          type="button"
          onClick={() => fillDemoAccount('recruiter@company.com', 'RecruiterPassword123!')}
        >
          Recruiter Demo
        </button>
      </div>
      <br />

      <div>
        Don't have an account? <Link to="/register">Sign Up</Link>
      </div>
    </div>
  );
}
