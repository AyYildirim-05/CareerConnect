import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchNotifications, markNotificationRead, clearAllNotifications } from '../services/notificationService';


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
    
    // Poll every 2 seconds for instant updates during testing
    const interval = setInterval(loadNotifs, 2000); 
    return () => clearInterval(interval);
  }, [isAuthenticated, token]);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id, token);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
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
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav>
      <strong>CareerConnect</strong> | {' '}
      {isAuthenticated && user ? (
        <>
          <Link to="/dashboard">Dashboard</Link> | <Link to="/jobs">Jobs</Link> | <Link to="/companies">Companies</Link> |{' '}
            
{user.role !== 'Recruiter' && (
  <>
    <Link to="/saved-jobs">Saved Jobs</Link> |{' '}
  </>
)}

{user.role === 'Job Seeker' && (
  <>
    <Link to="/profile">My Profile</Link> |{' '}
  </>
)}

        
          {user.role === 'Recruiter' && (
            <>
              <Link to={company ? `/companies/${company.id}` : '/recruiter/company'}>My Company</Link> | <Link to="/recruiter/jobs">My Postings</Link> |{' '}
            </>
          )}
          <Link to="/messages">Messages</Link> |{' '}
          <span style={{ position: 'relative', display: 'inline-block', margin: '0 4px' }}>
            <button onClick={() => setShowDropdown(!showDropdown)} style={{ cursor: 'pointer', background: 'none', border: '1px solid #ccc', padding: '2px 6px', borderRadius: '4px' }}>
              🔔 {unreadCount > 0 && <span style={{ background: 'red', color: 'white', borderRadius: '50%', padding: '1px 5px', fontSize: '10px' }}>{unreadCount}</span>}
            </button>

            {showDropdown && (
    <div style={{ position: 'absolute', left: 0, top: '28px', width: '280px', background: 'white', border: '1px solid #ccc', boxShadow: '0px 4px 6px rgba(0,0,0,0.1)', zIndex: 1000, padding: '10px', maxHeight: '350px', overflowY: 'auto', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <strong style={{ fontSize: '13px' }}>Deadline Reminders</strong>
        {notifications.length > 0 && (
          <button onClick={handleClearAll} style={{ fontSize: '10px', cursor: 'pointer', background: '#eea1e4', color: 'white', border: 'none', padding: '2px 6px', borderRadius: '3px' }}>
            Clear All
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>No deadline alerts yet.</p>
      ) : (
        notifications.map(n => (
          <div key={n.id} style={{ padding: '6px 0', borderBottom: '1px solid #eee', background: n.read ? '#fff' : '#f9f9f9' }}>
            <p style={{ fontSize: '11px', margin: '0 0 4px 0', color: '#333' }}>{n.message}</p>
            {!n.read && (
              <button onClick={() => handleMarkRead(n.id)} style={{ fontSize: '10px', cursor: 'pointer' }}>Mark as read</button>
            )}
          </div>
        ))
      )}
    </div>
  )}
          </span> |{' '}
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
