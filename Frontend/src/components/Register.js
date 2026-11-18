
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
      newErrors.password =
        'Password must be at least 6 characters long.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword =
        'Please confirm your password.';
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

      navigate(
        role === 'Recruiter'
          ? '/recruiter/company'
          : '/dashboard'
      );
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors);
      }

      setServerError(
        err.message || err.error || 'Registration failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoRole) => {
    setRole(demoRole);

    const num = Math.floor(100 + Math.random() * 900);

    setEmail(
      demoRole === 'Job Seeker'
        ? `seeker_${num}@test.com`
        : `recruiter_${num}@test.com`
    );

    setPassword('Password123!');
    setConfirmPassword('Password123!');
    setErrors({});
    setServerError('');
  };

  return (
    <main className="cc-register-page">
      <section className="cc-register-card">
        <div className="cc-register-header">
          <div className="cc-register-logo" aria-hidden="true">
            CC
          </div>

          <h1>Create Account</h1>
          <p>
            Join CareerConnect as a Job Seeker or Recruiter.
          </p>
        </div>

        {serverError && (
          <div className="cc-register-alert" role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <fieldset className="cc-register-roles">
            <legend>I am a</legend>

            <div className="cc-register-role-options">
              {['Job Seeker', 'Recruiter'].map(option => (
                <label
                  key={option}
                  className={
                    'cc-register-role-option' +
                    (role === option ? ' is-selected' : '')
                  }
                >
                  <input
                    type="radio"
                    name="role"
                    value={option}
                    checked={role === option}
                    onChange={(e) => setRole(e.target.value)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>

            {errors.role && (
              <p className="cc-register-error" role="alert">
                {errors.role}
              </p>
            )}
          </fieldset>

          <div className="cc-register-field">
            <label htmlFor="register-email">
              Email Address
            </label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? 'register-email-error' : undefined
              }
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && (
              <p
                id="register-email-error"
                className="cc-register-error"
                role="alert"
              >
                {errors.email}
              </p>
            )}
          </div>

          <div className="cc-register-field">
            <label htmlFor="register-password">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={password}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password
                  ? 'register-password-error'
                  : undefined
              }
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && (
              <p
                id="register-password-error"
                className="cc-register-error"
                role="alert"
              >
                {errors.password}
              </p>
            )}
          </div>

          <div className="cc-register-field">
            <label htmlFor="register-confirm-password">
              Confirm Password
            </label>
            <input
              id="register-confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Confirm your password"
              value={confirmPassword}
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={
                errors.confirmPassword
                  ? 'register-confirm-error'
                  : undefined
              }
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
            />
            {errors.confirmPassword && (
              <p
                id="register-confirm-error"
                className="cc-register-error"
                role="alert"
              >
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <button
            className="cc-register-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Creating Account...'
              : `Sign Up as ${role}`}
          </button>
        </form>

        <div className="cc-register-demo">
          <p>Quick Demo Fill</p>

          <div className="cc-register-demo-actions">
            <button
              type="button"
              onClick={() => fillDemo('Job Seeker')}
            >
              Job Seeker Demo
            </button>

            <button
              type="button"
              onClick={() => fillDemo('Recruiter')}
            >
              Recruiter Demo
            </button>
          </div>
        </div>

        <p className="cc-register-footer">
          Already have an account?{' '}
          <Link to="/login">Log In</Link>
        </p>
      </section>
    </main>
  );
}
