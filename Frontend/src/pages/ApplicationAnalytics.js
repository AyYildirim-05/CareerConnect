import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApplicationStats, fetchArchivedJobDetails } from '../services/applicationService';
import ApplicationCharts from '../components/ApplicationCharts';

export default function ApplicationAnalytics() {
  const { token } = useAuth();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [stats, setStats] = useState({
    metrics: {
      totalSubmitted: 0,
      interviewInvites: 0,
      offers: 0,
      rejections: 0,
      responseRate: 0,
      interviewRate: 0,
      offerConversionRate: 0
    },
    statusCounts: { Applied: 0, Interview: 0, Offered: 0, Rejected: 0 },
    monthlyActivity: [],
    applications: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Archived posting modal state
  const [selectedPosting, setSelectedPosting] = useState(null);
  const [loadingPosting, setLoadingPosting] = useState(false);

  // Format a local Date object as YYYY-MM-DD without UTC shifting
  const toLocalDateInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format ISO timestamp as MM-DD-YYYY in local timezone
  const formatDisplayDate = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}-${day}-${year}`;
  };

  const loadStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      let startISO = '';
      let endISO = '';

      if (startDate) {
        const [y, m, d] = startDate.split('-').map(Number);
        startISO = new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
      }
      if (endDate) {
        const [y, m, d] = endDate.split('-').map(Number);
        endISO = new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
      }

      const data = await fetchApplicationStats(token, {
        startDate: startISO,
        endDate: endISO
      });
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, startDate, endDate]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const applyPresetRange = (days) => {
    if (!days) {
      setStartDate('');
      setEndDate('');
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(toLocalDateInput(start));
    setEndDate(toLocalDateInput(end));
  };

  const handleViewPosting = async (applicationId) => {
    setLoadingPosting(true);
    try {
      const details = await fetchArchivedJobDetails(applicationId, token);
      setSelectedPosting(details);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingPosting(false);
    }
  };

  const filteredApplications = stats.applications.filter((app) =>
    statusFilter === 'ALL' ? true : app.status === statusFilter
  );

  const { metrics } = stats;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0' }}>Application Analytics & History</h1>
          <p style={{ margin: 0, color: '#555' }}>
            Track submission volume, response rates, and interview progression over time.
          </p>
        </div>

        {/* Date Range Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <label style={{ fontSize: '12px' }}>
            From:{' '}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label style={{ fontSize: '12px' }}>
            To:{' '}
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          <button type="button" onClick={() => applyPresetRange(30)} style={{ fontSize: '12px', cursor: 'pointer' }}>
            30D
          </button>
          <button type="button" onClick={() => applyPresetRange(180)} style={{ fontSize: '12px', cursor: 'pointer' }}>
            6M
          </button>
          <button type="button" onClick={() => applyPresetRange(null)} style={{ fontSize: '12px', cursor: 'pointer' }}>
            All Time
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', marginTop: '16px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ marginTop: '24px' }}>Loading analytics...</p>
      ) : (
        <>
          {/* Summary Card Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
            <SummaryCard title="Total Submitted" value={metrics.totalSubmitted} subtitle={`Response Rate: ${metrics.responseRate}%`} accent="#3b82f6" />
            <SummaryCard title="Interview Invites" value={metrics.interviewInvites} subtitle={`Interview Rate: ${metrics.interviewRate}%`} accent="#f59e0b" />
            <SummaryCard title="Offers Received" value={metrics.offers} subtitle={`Offer Conversion: ${metrics.offerConversionRate}%`} accent="#10b981" />
            <SummaryCard title="Rejections" value={metrics.rejections} subtitle="Closed outcomes" accent="#ef4444" />
          </div>

          {/* Interactive Charts */}
          <ApplicationCharts
            statusCounts={stats.statusCounts}
            monthlyActivity={stats.monthlyActivity}
          />

          {/* Application History Table */}
          <div style={{ marginTop: '28px', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Application History ({filteredApplications.length})</h3>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '4px 8px' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="Applied">Applied</option>
                <option value="Interview">Interview</option>
                <option value="Offered">Offered</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {filteredApplications.length === 0 ? (
              <p style={{ color: '#666' }}>No applications match the selected filters.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '8px' }}>Job Title</th>
                      <th style={{ padding: '8px' }}>Company</th>
                      <th style={{ padding: '8px' }}>Applied On</th>
                      <th style={{ padding: '8px' }}>Status</th>
                      <th style={{ padding: '8px' }}>Posting Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((app) => (
                      <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 500 }}>{app.jobTitle || 'Untitled Role'}</td>
                        <td style={{ padding: '10px 8px' }}>{app.companyName || '—'}</td>
                        <td style={{ padding: '10px 8px' }}>{formatDisplayDate(app.created_at)}</td>
                        <td style={{ padding: '10px 8px' }}>
                          <StatusBadge status={app.status} />
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <button
                            type="button"
                            onClick={() => handleViewPosting(app.id)}
                            disabled={loadingPosting}
                            style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '12px' }}
                          >
                            View Posting
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Archived Job Posting Quick-Action Modal */}
      {selectedPosting && (
        <div
          onClick={() => setSelectedPosting(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0' }}>{selectedPosting.job.title}</h2>
                <p style={{ margin: 0, color: '#555' }}>
                  {selectedPosting.job.companyName}
                  {selectedPosting.job.location ? ` • ${selectedPosting.job.location}` : ''}
                </p>
              </div>
              <button onClick={() => setSelectedPosting(null)} style={{ cursor: 'pointer' }}>✕</button>
            </div>

            {selectedPosting.archived && (
              <div style={{ background: '#fef3c7', color: '#92400e', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', marginTop: '12px' }}>
                Archived Posting: This listing is no longer active on the public job board.
              </div>
            )}

            <div style={{ marginTop: '16px', fontSize: '14px', lineHeight: 1.5 }}>
              {selectedPosting.job.department && <p><strong>Department:</strong> {selectedPosting.job.department}</p>}
              {selectedPosting.job.jobType && <p><strong>Job Type:</strong> {selectedPosting.job.jobType} ({selectedPosting.job.workMode})</p>}
              <p><strong>Description:</strong></p>
              <p style={{ whiteSpace: 'pre-line', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                {selectedPosting.job.description}
              </p>
              {selectedPosting.job.requirements && (
                <>
                  <p><strong>Requirements:</strong></p>
                  <p style={{ whiteSpace: 'pre-line', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                    {selectedPosting.job.requirements}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value, subtitle, accent }) {
  return (
    <div style={{ border: '1px solid #ddd', borderTop: `4px solid ${accent}`, borderRadius: '8px', padding: '16px', background: '#fff' }}>
      <div style={{ fontSize: '13px', color: '#555', fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '6px 0' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#64748b' }}>{subtitle}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Applied: { background: '#dbeafe', color: '#1e40af' },
    Interview: { background: '#fef3c7', color: '#92400e' },
    Offered: { background: '#d1fae5', color: '#065f46' },
    Rejected: { background: '#fee2e2', color: '#991b1b' }
  };
  const badgeStyle = styles[status] || styles.Applied;

  return (
    <span style={{ ...badgeStyle, padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
      {status}
    </span>
  );
}