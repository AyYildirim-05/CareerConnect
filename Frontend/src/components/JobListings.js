import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchPublishedJobs } from '../services/jobService';

/**
 * Active job listings: every published job posting, newest first.
 * Visible to all logged-in users (Job Seekers and Recruiters).
 */
export default function JobListings() {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const { token } = useAuth();

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await fetchPublishedJobs(token);
        setJobs(res.jobs);
      } catch (err) {
        setError(err.error || err.message || 'Failed to load job listings.');
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, [token]);

  if (loading) return <p>Loading job listings...</p>;

  return (
    <div>
      <h2>Job Listings</h2>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!error && jobs.length === 0 && <p>No open roles right now. Check back soon!</p>}

      {jobs.map((job) => (
        <div key={job.id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>{job.title}</h3>
          <p style={{ margin: '0.25rem 0' }}>
            {job.companyName || 'Company not specified'} · {job.department} · {job.location}
          </p>
          <p style={{ margin: '0.25rem 0' }}>
            <strong>{job.jobType}</strong> · <strong>{job.workMode}</strong>
          </p>
          <p style={{ whiteSpace: 'pre-wrap' }}>{job.description}</p>
          <p><strong>Requirements:</strong></p>
          <p style={{ whiteSpace: 'pre-wrap' }}>{job.requirements}</p>
          <small>Posted {new Date(job.publishedAt).toLocaleDateString()}</small>
        </div>
      ))}
    </div>
  );
}
