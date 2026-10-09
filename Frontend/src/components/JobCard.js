import React from 'react';
import { Link } from 'react-router-dom';

/**
 * One published job posting, shown in the job listings and on company pages.
 * The company name links to the company's page.
 */
export default function JobCard({ job }) {
  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
      <h3 style={{ margin: 0 }}>{job.title}</h3>
      <p style={{ margin: '0.25rem 0' }}>
        {job.companyId
          ? <Link to={`/companies/${job.companyId}`}>{job.companyName}</Link>
          : 'Company not specified'}
        {' '}· {job.department} · {job.location}
      </p>
      <p style={{ margin: '0.25rem 0' }}>
        <strong>{job.jobType}</strong> · <strong>{job.workMode}</strong>
      </p>
      <p style={{ whiteSpace: 'pre-wrap' }}>{job.description}</p>
      <p><strong>Requirements:</strong></p>
      <p style={{ whiteSpace: 'pre-wrap' }}>{job.requirements}</p>
      <small>Posted {new Date(job.publishedAt).toLocaleDateString()}</small>
    </div>
  );
}
