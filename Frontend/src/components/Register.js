import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [role, setRole] = useState('Job Seeker');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
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
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!['Job Seeker', 'Recruiter'].includes(role)) {
      newErrors.role = 'Please select a valid role.';
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
      await register(email.trim(), password, role);
      navigate('/dashboard');
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors);
      }
      setServerError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoRole) => {
    setRole(demoRole);
    const num = Math.floor(100 + Math.random() * 900);
    setEmail(demoRole === 'Job Seeker' ? `seeker_${num}@test.com` : `recruiter_${num}@test.com`);
    setPassword('Password123!');
    setConfirmPassword('Password123!');
    setErrors({});
    setServerError('');
  };

  return (
    <div>
      <h2>Create Account</h2>
      <p>Sign up as a Job Seeker or Recruiter</p>

      {/* Role Selector Radio Buttons */}
      <div>
        <label>
          <input
            type="radio"
            name="role"
            value="Job Seeker"
            checked={role === 'Job Seeker'}
            onChange={(e) => setRole(e.target.value)}
          />
          Job Seeker
        </label>
        {' '}
        <label>
          <input
            type="radio"
            name="role"
            value="Recruiter"
            checked={role === 'Recruiter'}
            onChange={(e) => setRole(e.target.value)}
          />
          Recruiter
        </label>
      </div>
      <br />

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

        <div>
          <label htmlFor="confirmPassword">Confirm Password:</label><br />
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {errors.confirmPassword && <p style={{ color: 'red' }}>{errors.confirmPassword}</p>}
        </div>
        <br />

        <button type="submit" disabled={loading}>
          {loading ? 'Creating Account...' : `Sign Up as ${role}`}
        </button>
      </form>
      <br />

      <div>
        <small>Quick Demo Fill:</small><br />
        <button type="button" onClick={() => fillDemo('Job Seeker')}>Job Seeker Demo</button>
        {' '}
        <button type="button" onClick={() => fillDemo('Recruiter')}>Recruiter Demo</button>
      </div>
      <br />

      <div>
        Already have an account? <Link to="/login">Log In</Link>
      </div>
    </div>
  );
}
