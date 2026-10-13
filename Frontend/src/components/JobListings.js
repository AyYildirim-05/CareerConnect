import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchPublishedJobs, fetchSavedJobs } from '../services/jobService';
import JobCard from './JobCard';
import BookmarkButton from './BookmarkButton';

/**
 * Active job listings: every published job posting, newest first.
 * Visible to all logged-in users (Job Seekers and Recruiters).
 * Each listing has a bookmark button to save it for later.
 */
export default function JobListings() {
  const [jobs, setJobs] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
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
        setLoading(false);
        return;
      }

      // Saved state is secondary: if this fails, listings still show
      try {
        const saved = await fetchSavedJobs(token);
        setSavedIds(new Set(saved.jobs.map((j) => j.id)));
      } catch (err) {
        console.error('Failed to load saved jobs:', err);
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
        <div key={job.id}>
          <JobCard job={job} />
          <BookmarkButton jobId={job.id} initiallySaved={savedIds.has(job.id)} />
        </div>
      ))}
    </div>
  );
}