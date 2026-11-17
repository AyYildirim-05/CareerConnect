import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchMyJobs, publishJob, deleteJob } from '../services/jobService';
import { fetchJobApplicants, updateApplicationStatus } from '../services/applicationService';

export default function MyJobPostings() {
  const [jobs, setJobs] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Applicants view state
  const [activeJobId, setActiveJobId] = useState(null);
  const [jobApplicants, setJobApplicants] = useState({});
  const [loadingApplicants, setLoadingApplicants] = useState(false);

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
      setJobs(jobs.filter((j) => j.id !== job.id));
      setMessage(res.message);
    } catch (err) {
      setMessage(err.error || err.message || 'Failed to delete job posting.');
    }
  };

  const toggleApplicants = async (jobId) => {
    if (activeJobId === jobId) {
      setActiveJobId(null);
      return;
    }

    setActiveJobId(jobId);
    if (!jobApplicants[jobId]) {
      setLoadingApplicants(true);
      try {
        const res = await fetchJobApplicants(token, jobId);
        setJobApplicants((prev) => ({ ...prev, [jobId]: res.applications || [] }));
      } catch (err) {
        alert(err.message || 'Failed to fetch applicants.');
      } finally {
        setLoadingApplicants(false);
      }
    }
  };

  const handleStatusChange = async (jobId, applicationId, newStatus) => {
    try {
      await updateApplicationStatus(token, applicationId, newStatus);
      setJobApplicants((prev) => {
        const list = prev[jobId] || [];
        return {
          ...prev,
          [jobId]: list.map((app) => (app.id === applicationId ? { ...app, status: newStatus } : app))
        };
      });
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
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
        <table border="1" cellPadding="6" style={{ marginTop: '1rem', borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left' }}>
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
              <React.Fragment key={job.id}>
                <tr>
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
                    {job.status === 'published' && (
                      <>
                        {' '}
                        <button type="button" onClick={() => toggleApplicants(job.id)}>
                          {activeJobId === job.id ? 'Hide Applicants' : 'View Applicants'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>

                {/* Applicants table and status dropdown */}
                {activeJobId === job.id && (
                  <tr>
                    <td colSpan="6" style={{ backgroundColor: '#f8fafc', padding: '1rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0' }}>Applicants for {job.title}</h4>
                      {loadingApplicants ? (
                        <p>Loading applicants...</p>
                      ) : !jobApplicants[job.id] || jobApplicants[job.id].length === 0 ? (
                        <p style={{ color: '#64748b', margin: 0 }}>No applications submitted for this job yet.</p>
                      ) : (
                        <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#edf2f7', textAlign: 'left' }}>
                              <th>Candidate Name</th>
                              <th>Email</th>
                              <th>Date Applied</th>
                              <th>Resume</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {jobApplicants[job.id].map((applicant) => (
                              <tr key={applicant.id}>
                                <td><strong>{applicant.applicantName || 'Applicant'}</strong></td>
                                <td>{applicant.applicantEmail || 'N/A'}</td>
                                <td>{applicant.created_at ? new Date(applicant.created_at).toLocaleDateString() : 'Recent'}</td>
                                <td>
                                  {applicant.resumeUrl ? (
                                    <span style={{ color: '#2563eb' }}>Resume on file ✓</span>
                                  ) : (
                                    <span style={{ color: '#64748b' }}>None</span>
                                  )}
                                </td>
                                <td>
                                  <select
                                    value={applicant.status}
                                    onChange={(e) => handleStatusChange(job.id, applicant.id, e.target.value)}
                                    style={{ padding: '0.25rem 0.5rem', borderRadius: '4px' }}
                                  >
                                    <option value="Applied">Applied</option>
                                    <option value="Interview">Interview</option>
                                    <option value="Offered">Offered</option>
                                    <option value="Rejected">Rejected</option>
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
