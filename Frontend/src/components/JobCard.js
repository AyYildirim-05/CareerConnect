
import React from 'react';
import { Link } from 'react-router-dom';
import JobMatchWidget from './JobMatchWidget';
import MockInterviewWidget from './MockInterviewWidget';

/**
 * One published job posting, shown in the job listings
 * and on company pages.
 *
 * Responsive layout for desktop, tablet, and mobile.
 * Preserves AI Match, Skill Gap Analysis, and Mock Interview.
 */
export default function JobCard({ job }) {
  return (
    <article
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '1rem',
        marginBottom: '1rem',
        backgroundColor: '#fff',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        overflowWrap: 'anywhere'
      }}
    >
      {/* Job information and AI compatibility */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          minWidth: 0
        }}
      >
        {/* Job details */}
        <div
          style={{
            flex: '1 1 220px',
            minWidth: 0
          }}
        >
          <h3
            style={{
              margin: 0,
              color: '#0f172a',
              fontSize: '1.1rem',
              lineHeight: 1.4,
              overflowWrap: 'anywhere'
            }}
          >
            {job.title}
          </h3>

          <p
            style={{
              margin: '0.5rem 0',
              color: '#475569',
              lineHeight: 1.6,
              overflowWrap: 'anywhere'
            }}
          >
            {job.companyId ? (
              <Link to={`/companies/${job.companyId}`}>
                {job.companyName}
              </Link>
            ) : (
              job.companyName || 'Company not specified'
            )}

            {job.department && (
              <> · {job.department}</>
            )}

            {job.location && (
              <> · {job.location}</>
            )}
          </p>

          <p
            style={{
              margin: '0.5rem 0',
              color: '#334155',
              lineHeight: 1.6
            }}
          >
            {job.jobType && (
              <strong>{job.jobType}</strong>
            )}

            {job.jobType && job.workMode && ' · '}

            {job.workMode && (
              <strong>{job.workMode}</strong>
            )}
          </p>
        </div>

        {/* AI Compatibility and Skill Gap Analysis */}
        {job.id && (
          <div
            style={{
              flex: '0 1 auto',
              minWidth: 0,
              maxWidth: '100%'
            }}
          >
            <JobMatchWidget jobId={job.id} />
          </div>
        )}
      </div>

      {/* Job description */}
      <p
        style={{
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          lineHeight: 1.6,
          color: '#334155',
          marginTop: '1.25rem'
        }}
      >
        {job.description}
      </p>

      {/* Job requirements */}
      <p
        style={{
          fontWeight: 600,
          color: '#0f172a',
          marginBottom: '0.5rem'
        }}
      >
        Requirements:
      </p>

      <p
        style={{
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          lineHeight: 1.6,
          color: '#334155'
        }}
      >
        {job.requirements}
      </p>

      {/* Posting date and Mock Interview */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginTop: '1.25rem'
        }}
      >
        <small
          style={{
            color: '#64748b',
            fontSize: '0.8rem'
          }}
        >
          Posted{' '}
          {job.publishedAt
            ? new Date(job.publishedAt).toLocaleDateString()
            : 'Date unavailable'}
        </small>

        <div
          style={{
            maxWidth: '100%',
            minWidth: 0
          }}
        >
          <MockInterviewWidget job={job} />
        </div>
      </div>
    </article>
  );
}
