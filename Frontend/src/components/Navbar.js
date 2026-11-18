
import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchNotifications,
  markNotificationRead,
  clearAllNotifications
} from '../services/notificationService';

export default function Navbar() {
  const { user, isAuthenticated, logout, company, token } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    async function loadNotifs() {
      try {
        const res = await fetchNotifications(token);
        setNotifications(res.notifications || []);
      } catch (err) {
        console.error('Failed to load notifications', err);
      }
    }

    loadNotifs();

    // Keep existing notification polling behavior.
    const interval = setInterval(loadNotifs, 2000);
    return () => clearInterval(interval);
  }, [isAuthenticated, token]);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id, token);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications(token);
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  };

  const handleLogout = () => {
    setShowDropdown(false);
    logout();
    navigate('/login');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const navClass = ({ isActive }) =>
    `cc-nav-link${isActive ? ' cc-nav-link-active' : ''}`;

  return (
    <header className="cc-navbar">
      <nav className="cc-navbar-inner" aria-label="Main navigation">
        <Link
          to={isAuthenticated ? '/dashboard' : '/login'}
          className="cc-navbar-brand"
        >
          <span className="cc-brand-icon" aria-hidden="true">
            CC
          </span>
          <span>CareerConnect</span>
        </Link>

        {isAuthenticated && user ? (
          <>
            <div className="cc-navbar-links">
              <NavLink to="/dashboard" className={navClass}>
                Dashboard
              </NavLink>

              <NavLink to="/jobs" className={navClass}>
                Jobs
              </NavLink>

              <NavLink to="/companies" className={navClass}>
                Companies
              </NavLink>

              {user.role !== 'Recruiter' && (
                <NavLink to="/saved-jobs" className={navClass}>
                  Saved Jobs
                </NavLink>
              )}

              {user.role === 'Recruiter' && (
                <>
                  <NavLink
                    to={
                      company
                        ? `/companies/${company.id}`
                        : '/recruiter/company'
                    }
                    className={navClass}
                  >
                    My Company
                  </NavLink>

                  <NavLink to="/recruiter/jobs" className={navClass}>
                    My Postings
                  </NavLink>
                </>
              )}

              <NavLink to="/messages" className={navClass}>
                Messages
              </NavLink>
            </div>

            <div className="cc-navbar-actions">
              <div className="cc-notification-wrapper">
                <button
                  type="button"
                  className="cc-notification-button"
                  aria-label={`Notifications, ${unreadCount} unread`}
                  aria-expanded={showDropdown}
                  aria-controls="cc-notification-panel"
                  onClick={() => setShowDropdown(prev => !prev)}
                >
                  <span aria-hidden="true">🔔</span>

                  {unreadCount > 0 && (
                    <span className="cc-notification-count">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showDropdown && (
                  <div
                    id="cc-notification-panel"
                    className="cc-notification-panel"
                    aria-label="Deadline reminders"
                  >
                    <div className="cc-notification-header">
                      <strong>Deadline Reminders</strong>

                      {notifications.length > 0 && (
                        <button
                          type="button"
                          className="cc-notification-clear"
                          onClick={handleClearAll}
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {notifications.length === 0 ? (
                      <p className="cc-muted">
                        No deadline alerts yet.
                      </p>
                    ) : (
                      <div className="cc-notification-list">
                        {notifications.map(n => (
                          <div
                            key={n.id}
                            className={
                              `cc-notification-item${n.read ? '' : ' cc-notification-unread'}`
                            }
                          >
                            <p>{n.message}</p>

                            {!n.read && (
                              <button
                                type="button"
                                className="cc-notification-mark"
                                onClick={() => handleMarkRead(n.id)}
                              >
                                Mark as read
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="cc-navbar-user">
                <span className="cc-navbar-email">
                  {user.email}
                </span>
                <span className="cc-navbar-role">
                  {user.role}
                </span>
              </div>

              <button
                type="button"
                className="cc-button cc-button-secondary"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <div className="cc-navbar-links cc-navbar-guest">
            <NavLink to="/login" className={navClass}>
              Log In
            </NavLink>

            <NavLink to="/register" className={navClass}>
              Sign Up
            </NavLink>
          </div>
        )}
      </nav>
    </header>
  );
}
