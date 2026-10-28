import React from 'react';
import { Link } from 'react-router-dom';
import JobMatchWidget from './JobMatchWidget';

/**
 * One published job posting, shown in the job listings and on company pages.
 * The company name links to the company's page.
 * Displays the AI Compatibility Progress Badge & Skill Gap Analysis next to the posting.
 */
export default function JobCard({ job }) {
  return (
    <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', backgroundColor: '#fff' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '0.75rem',
          paddingRight: '6.5rem'
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>{job.title}</h3>
          <p style={{ margin: '0.25rem 0' }}>
            {job.companyId
              ? <Link to={`/companies/${job.companyId}`}>{job.companyName}</Link>
              : (job.companyName || 'Company not specified')}
            {' '}· {job.department} · {job.location}
          </p>
          <p style={{ margin: '0.25rem 0' }}>
            <strong>{job.jobType}</strong> · <strong>{job.workMode}</strong>
          </p>
        </div>

        {/* AI Compatibility Progress Bar Badge & 2-3 Bullet Gap Analysis (Task 9.3) */}
        {job.id && <JobMatchWidget jobId={job.id} />}
      </div>

      <p style={{ whiteSpace: 'pre-wrap' }}>{job.description}</p>
      <p><strong>Requirements:</strong></p>
      <p style={{ whiteSpace: 'pre-wrap' }}>{job.requirements}</p>
      <small>Posted {new Date(job.publishedAt).toLocaleDateString()}</small>
    </div>
  );
}
