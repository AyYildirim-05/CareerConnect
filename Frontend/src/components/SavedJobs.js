import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchSavedJobs } from '../services/jobService';
import JobCard from './JobCard';
import BookmarkButton from './BookmarkButton';

/**
 * Dedicated "Saved Jobs" view: the user's bookmarked jobs, removable in place.
 */
export default function SavedJobs() {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const { token } = useAuth();

  useEffect(() => {
    async function loadSaved() {
      try {
        const res = await fetchSavedJobs(token);
        setJobs(res.jobs);
      } catch (err) {
        setError(err.error || err.message || 'Failed to load saved jobs.');
      } finally {
        setLoading(false);
      }
    }
    loadSaved();
  }, [token]);

  const removeFromList = (id) => setJobs((prev) => prev.filter((j) => j.id !== id));

  if (loading) return <p>Loading saved jobs...</p>;

  return (
    <div>
      <h2>Saved Jobs</h2>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!error && jobs.length === 0 && <p>You haven't saved any jobs yet.</p>}

      {jobs.map((job) => (
        <div key={job.id}>
          <JobCard job={job} />
          <BookmarkButton
            jobId={job.id}
            initiallySaved
            onChange={(saved) => { if (!saved) removeFromList(job.id); }}
          />
        </div>
      ))}
    </div>
  );
}