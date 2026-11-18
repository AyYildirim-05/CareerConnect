
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchCompany } from '../services/companyService';
import JobCard from './JobCard';

/**
 * Public company page: company details plus its open
 * (published) jobs. Used at /companies/:id.
 */
export default function CompanyPage() {
  const { id } = useParams();

  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const { user, token } = useAuth();

  useEffect(() => {
    let cancelled = false;

    async function loadCompany() {
      setLoading(true);
      setError('');

      try {
        const res = await fetchCompany(id, token);

        if (!cancelled) {
          setCompany(res.company);
          setJobs(res.jobs || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.error ||
            err.message ||
            'Failed to load company page.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCompany();

    return () => {
      cancelled = true;
    };
  }, [id, token]);

  if (loading) {
    return (
      <main className="cc-company-profile-page">
        <div className="cc-company-profile-state" role="status">
          Loading company page...
        </div>
      </main>
    );
  }

  if (error || !company) {
    return (
      <main className="cc-company-profile-page">
        <div className="cc-company-profile-error" role="alert">
          {error || 'Company not found.'}
        </div>
      </main>
    );
  }

  const isOwner =
    user && String(user.id) === String(company.ownerId);

  const details = [
    company.industry,
    company.size && `${company.size} employees`,
    company.location
  ].filter(Boolean);

  const initials = (company.name || 'Company')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('');

  const website = company.website || '';

  const websiteHref = /^https?:\/\//i.test(website)
    ? website
    : `https://${website}`;

  return (
    <main className="cc-company-profile-page">
      <div className="cc-company-profile-container">

        {/* Company profile header */}
        <section className="cc-company-profile-card">
          {company.banner && (
            <div className="cc-company-profile-banner">
              <img
                src={company.banner}
                alt={`${company.name} banner`}
              />
            </div>
          )}

          <div className="cc-company-profile-header">
            <div className="cc-company-profile-identity">
              {company.logo ? (
                <img
                  className="cc-company-profile-logo"
                  src={company.logo}
                  alt={`${company.name} logo`}
                />
              ) : (
                <div
                  className="cc-company-profile-logo-placeholder"
                  aria-hidden="true"
                >
                  {initials}
                </div>
              )}

              <div className="cc-company-profile-info">
                <h1>{company.name}</h1>

                {details.length > 0 && (
                  <p className="cc-company-profile-details">
                    {details.join(' · ')}
                  </p>
                )}

                {website && (
                  <a
                    className="cc-company-profile-website"
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Visit company website
                    <span aria-hidden="true"> ↗</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {isOwner && (
            <div className="cc-company-profile-actions">
              <Link
                to="/recruiter/company"
                className="cc-company-profile-button"
              >
                Edit Company Profile
              </Link>

              <Link
                to="/recruiter/jobs/new"
                className="cc-company-profile-button cc-company-profile-button-primary"
              >
                + Post a Job
              </Link>

              <Link
                to="/recruiter/jobs"
                className="cc-company-profile-button"
              >
                Manage My Postings
              </Link>
            </div>
          )}
        </section>

        {/* About section */}
        <section
          className="cc-company-profile-section"
          aria-labelledby="cc-company-about-title"
        >
          <h2 id="cc-company-about-title">
            About the Company
          </h2>

          <div className="cc-company-profile-about">
            <p>
              {company.description ||
                'No company description available yet.'}
            </p>
          </div>
        </section>

        {/* Open jobs section */}
        <section
          className="cc-company-profile-section"
          aria-labelledby="cc-company-jobs-title"
        >
          <div className="cc-company-profile-section-heading">
            <h2 id="cc-company-jobs-title">
              Open Jobs
            </h2>

            <span className="cc-company-profile-job-count">
              {jobs.length}
            </span>
          </div>

          {jobs.length === 0 ? (
            <div className="cc-company-profile-empty">
              <h3>No open roles right now</h3>
              <p>
                This company has no published job
                opportunities at the moment.
              </p>
            </div>
          ) : (
            <div className="cc-company-profile-jobs">
              {jobs.map(job => (
                <div
                  key={job.id}
                  className="cc-company-profile-job"
                >
                  <JobCard job={job} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
