import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchMyJobs, publishJob, deleteJob } from '../services/jobService';

/**
 * Recruiter view of their own job postings (drafts and published),
 * with links to edit and a button to publish drafts.
 */
export default function MyJobPostings() {
  const [jobs, setJobs] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const { token } = useAuth();

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await fetchMyJobs(token);
        setJobs(res.jobs);
      } catch (err) {
        setMessage(err.error || err.message || 'Failed to load your job postings.');
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, [token]);

  const handlePublish = async (id) => {
    setMessage('');
    try {
      const res = await publishJob(id, token);
      // Replace the published job in the list so its status updates on screen
      setJobs(jobs.map((job) => (job.id === id ? res.job : job)));
      setMessage(res.message);
    } catch (err) {
      setMessage(err.error || err.message || 'Failed to publish job posting.');
    }
  };

  const handleDelete = async (job) => {
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return;

    setMessage('');
    try {
      const res = await deleteJob(job.id, token);
      // Remove the deleted job from the list on screen
      setJobs(jobs.filter((j) => j.id !== job.id));
      setMessage(res.message);
    } catch (err) {
      setMessage(err.error || err.message || 'Failed to delete job posting.');
    }
  };

  if (loading) return <p>Loading your job postings...</p>;

  return (
    <div>
      <h2>My Job Postings</h2>
      <Link to="/recruiter/jobs/new">+ Create Job Posting</Link>

      {message && <p>{message}</p>}

      {jobs.length === 0 ? (
        <p>You haven't created any job postings yet.</p>
      ) : (
        <table border="1" cellPadding="6" style={{ marginTop: '1rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Department</th>
              <th>Location</th>
              <th>Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>{job.title}</td>
                <td>{job.department}</td>
                <td>{job.location}</td>
                <td>{job.jobType} · {job.workMode}</td>
                <td>{job.status === 'published' ? 'Published' : 'Draft'}</td>
                <td>
                  <Link to={`/recruiter/jobs/${job.id}/edit`}>Edit</Link>
                  {job.status !== 'published' && (
                    <>
                      {' '}
                      <button type="button" onClick={() => handlePublish(job.id)}>Publish</button>
                    </>
                  )}
                  {' '}
                  <button type="button" onClick={() => handleDelete(job)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
