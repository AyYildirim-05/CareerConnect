import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchMyApplications } from '../services/applicationService';

// Colors for status badges
const STATUS_CONFIG = {
  Applied: {
    bg: '#dbeafe',
    color: '#1e40af',
    border: '1px solid #93c5fd'
  },
  Interview: {
    bg: '#ede9fe',
    color: '#5b21b6',
    border: '1px solid #c4b5fd'
  },
  Offered: {
    bg: '#dcfce7',
    color: '#166534',
    border: '1px solid #86efac'
  },
  Rejected: {
    bg: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fca5a5'
  }
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    bg: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db'
  };

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.25rem 0.65rem',
        borderRadius: '9999px',
        fontSize: '0.85rem',
        fontWeight: '600',
        backgroundColor: config.bg,
        color: config.color,
        border: config.border,
        textAlign: 'center'
      }}
    >
      {status || 'Applied'}
    </span>
  );
}

// Table showing job seeker's submitted applications and their status
export default function ApplicationTracker() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { token } = useAuth();

  const loadApplications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchMyApplications(token);
      setApplications(res.applications || []);
    } catch (err) {
      setError(err.message || 'Failed to load your applications.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  return (
    <div style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Application Status Tracking</h3>
        <button
          type="button"
          onClick={loadApplications}
          disabled={loading}
          style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
        >
          {loading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}

      {loading ? (
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Loading submitted applications...</p>
      ) : applications.length === 0 ? (
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
          You have not submitted any applications yet. <Link to="/jobs">Browse Job Listings</Link> to apply!
        </p>
      ) : (
        <table
          border="1"
          cellPadding="8"
          style={{
            width: '100%',
            marginTop: '0.75rem',
            borderCollapse: 'collapse',
            backgroundColor: '#ffffff'
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
              <th>Job Title</th>
              <th>Company</th>
              <th>Date Applied</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id}>
                <td>
                  <strong>{app.jobTitle || 'Job Application'}</strong>
                </td>
                <td>{app.companyName || 'N/A'}</td>
                <td>
                  {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'Recent'}
                </td>
                <td>
                  <StatusBadge status={app.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
