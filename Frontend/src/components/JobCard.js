
import React from 'react';
import { Link } from 'react-router-dom';
import JobMatchWidget from './JobMatchWidget';
import MockInterviewWidget from './MockInterviewWidget';

/**
 * Shared job posting card.
 * Used in Job Listings and Company Pages.
 * Preserves AI Match, Gap Analysis and Mock Interview.
 */
export default function JobCard({ job }) {
  const initials = (job.companyName || 'Company')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('');

  const postedDate = job.publishedAt
    ? new Date(job.publishedAt).toLocaleDateString(
        'en-CA',
        {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }
      )
    : 'Date unavailable';

  const requirements = Array.isArray(job.requirements)
    ? job.requirements
    : typeof job.requirements === 'string'
      ? job.requirements
          .split(/[,;\n]+/)
          .map(item => item.trim())
          .filter(Boolean)
      : [];

  const visibleRequirements = requirements.slice(0, 8);
  const remainingRequirements = Math.max(
    0,
    requirements.length - visibleRequirements.length
  );

  return (
    <article className="cc-modern-job-card">

      {/* Header */}
      <div className="cc-modern-job-header">
        <div className="cc-modern-job-identity">
          <div
            className="cc-modern-job-company-icon"
            aria-hidden="true"
          >
            {initials}
          </div>

          <div className="cc-modern-job-heading">
            <h3>{job.title}</h3>

            <div className="cc-modern-job-company">
              {job.companyId ? (
                <Link to={`/companies/${job.companyId}`}>
                  {job.companyName || 'Company'}
                </Link>
              ) : (
                <span>
                  {job.companyName || 'Company not specified'}
                </span>
              )}

              {job.location && (
                <span className="cc-modern-job-location">
                  <span aria-hidden="true"> · </span>
                  {job.location}
                </span>
              )}
            </div>

            <div className="cc-modern-job-badges">
              {job.jobType && (
                <span className="cc-modern-job-badge cc-modern-job-badge-blue">
                  {job.jobType}
                </span>
              )}

              {job.workMode && (
                <span className="cc-modern-job-badge cc-modern-job-badge-green">
                  {job.workMode}
                </span>
              )}

              {job.department && (
                <span className="cc-modern-job-badge">
                  {job.department}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {job.description && (
        <div className="cc-modern-job-description">
          <p>{job.description}</p>
        </div>
      )}

      {/* Requirements */}
      {requirements.length > 0 && (
        <section className="cc-modern-job-skills">
          <h4>Required Skills</h4>

          <div className="cc-modern-job-skill-list">
            {visibleRequirements.map((skill, index) => (
              <span
                className="cc-modern-job-skill"
                key={`${skill}-${index}`}
              >
                {skill}
              </span>
            ))}

            {remainingRequirements > 0 && (
              <span className="cc-modern-job-skill cc-modern-job-skill-more">
                +{remainingRequirements} more
              </span>
            )}
          </div>
        </section>
      )}

      {/* AI Match and Skill Gap Analysis */}
      {job.id && (
        <div className="cc-modern-job-ai">
          <div className="cc-modern-job-ai-label">
            <span aria-hidden="true">✦</span>
            <strong>AI Compatibility</strong>
          </div>

          <div className="cc-modern-job-ai-widget">
            <JobMatchWidget jobId={job.id} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="cc-modern-job-footer">
        <span className="cc-modern-job-date">
          <span aria-hidden="true">◷</span>
          Posted {postedDate}
        </span>

        <div className="cc-modern-job-interview">
          <MockInterviewWidget job={job} />
        </div>
      </div>

    </article>
  );
}
