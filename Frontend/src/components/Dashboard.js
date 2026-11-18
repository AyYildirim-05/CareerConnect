
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ApplicationTracker from './ApplicationTracker';

const seekerTools = [
  {
    title: 'Browse Job Listings',
    description: 'Explore available job opportunities.',
    path: '/jobs'
  },
  {
    title: 'Browse Companies',
    description: 'Discover companies and employers.',
    path: '/companies'
  },
  {
    title: 'My Profile',
    description: 'Manage your personal information.',
    path: '/profile'
  },
  {
    title: 'Application Analytics & History',
    description: 'Review your application history.',
    path: '/application-analytics'
  },
  {
    title: 'Resume Management & Parsing',
    description: 'Upload and manage your resume.',
    path: '/resume-management'
  },
  {
    title: 'Application Status Tracking',
    description: 'Track your job applications.',
    path: '#application-tracker'
  },
  {
    title: 'Saved Favorite Jobs',
    description: 'View your saved job listings.',
    path: '/saved-jobs'
  }
];

export default function Dashboard() {
  const { user, company } = useAuth();

  if (!user) return null;

  const isSeeker = user.role === 'Job Seeker';

  return (
    <div className="cc-container cc-dashboard">
      <header className="cc-dashboard-header">
        <div>
          <h1>Welcome, {user.email}</h1>
          <p className="cc-muted">
            Manage your CareerConnect activities.
          </p>
        </div>

        <span className="cc-role-badge">
          {user.role}
        </span>
      </header>

      <section aria-labelledby="dashboard-tools-heading">
        <h2 id="dashboard-tools-heading">
          {isSeeker ? 'Job Seeker Tools' : 'Recruiter Tools'}
        </h2>

        {isSeeker ? (
          <div className="cc-grid">
            {seekerTools.map(tool => (
              <Link
                key={tool.title}
                to={tool.path}
                className="cc-tool-card"
              >
                <h3>{tool.title}</h3>
                <p>{tool.description}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="cc-grid">
            {company && (
              <Link
                to={`/companies/${company.id}`}
                className="cc-tool-card"
              >
                <h3>View My Company Page</h3>
                <p>{company.name}</p>
              </Link>
            )}

            <Link
              to="/recruiter/company"
              className="cc-tool-card"
            >
              <h3>Edit Company Profile</h3>
              <p>Update company information.</p>
            </Link>

            <Link
              to="/recruiter/jobs/new"
              className="cc-tool-card"
            >
              <h3>Post New Job Listings</h3>
              <p>Create a new job posting.</p>
            </Link>

            <Link
              to="/recruiter/jobs"
              className="cc-tool-card"
            >
              <h3>Manage My Job Postings</h3>
              <p>Review and edit your job listings.</p>
            </Link>

            <Link
              to="/jobs"
              className="cc-tool-card"
            >
              <h3>View Active Job Listings</h3>
              <p>Browse currently available jobs.</p>
            </Link>

            <div className="cc-tool-card">
              <h3>Screening Question Library</h3>
              <p>Manage screening questions.</p>
            </div>

            <div className="cc-tool-card">
              <h3>Manage Candidate Applications</h3>
              <p>Review candidate applications.</p>
            </div>
          </div>
        )}
      </section>

      {isSeeker && (
        <section
          id="application-tracker"
          className="cc-dashboard-tracker cc-card"
          aria-label="Application Status Tracking"
        >
          <ApplicationTracker />
        </section>
      )}
    </div>
  );
}
