import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchCompany } from '../services/companyService';
import JobCard from './JobCard';

/**
 * Public company page: company details plus its open (published) jobs.
 * Used at /companies/:id.
 */
export default function CompanyPage() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const { user, token } = useAuth();

  useEffect(() => {
    async function loadCompany() {
      setLoading(true);
      setError('');
      try {
        const res = await fetchCompany(id, token);
        setCompany(res.company);
        setJobs(res.jobs);
      } catch (err) {
        setError(err.error || err.message || 'Failed to load company page.');
      } finally {
        setLoading(false);
      }
    }
    loadCompany();
  }, [id, token]);

  if (loading) return <p>Loading company page...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  const isOwner = user && user.id === company.ownerId;
  const details = [
    company.industry,
    company.size && `${company.size} employees`,
    company.location
  ].filter(Boolean);

  return (
    <div>
      <h1 style={{ marginBottom: '0.25rem' }}>{company.name}</h1>
      {details.length > 0 && <p style={{ margin: '0.25rem 0' }}>{details.join(' · ')}</p>}
      {company.website && (
        <p style={{ margin: '0.25rem 0' }}>
          <a href={company.website} target="_blank" rel="noopener noreferrer">{company.website}</a>
        </p>
      )}
      {isOwner && (
        <p>
          <Link to="/recruiter/company">Edit company profile</Link>
          {' | '}
          <Link to="/recruiter/jobs/new">+ Post a Job</Link>
          {' | '}
          <Link to="/recruiter/jobs">Manage my postings</Link>
        </p>
      )}

      <h3>About</h3>
      <p style={{ whiteSpace: 'pre-wrap' }}>{company.description}</p>

      <h3>Open Jobs ({jobs.length})</h3>
      {jobs.length === 0 && <p>No open roles right now.</p>}
      {jobs.map((job) => <JobCard key={job.id} job={job} />)}
    </div>
  );
}
