import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav>
      <strong>CareerConnect</strong> | {' '}
      {isAuthenticated && user ? (
        <>
          <Link to="/dashboard">Dashboard</Link> | <Link to="/messages">Messages</Link> |{' '}
          <span>Logged in as: {user.email} ({user.role})</span>{' '}
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login">Log In</Link> | <Link to="/register">Sign Up</Link>
        </>
      )}
      <hr />
    </nav>
  );
}
