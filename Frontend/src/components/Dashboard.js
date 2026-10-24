import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ResumeUpload from "./ResumeUpload";

export default function Dashboard() {
  const { user, company } = useAuth();

  if (!user) return null;

  const isSeeker = user.role === 'Job Seeker';

  return (
    <div>
      <h1>Welcome, {user.email}</h1>
      <p>Role: {user.role}</p>

      <h3>{isSeeker ? 'Job Seeker Tools' : 'Recruiter Tools'}</h3>
      {isSeeker ? (
        <div>
        <ul>
          <li><Link to="/jobs">Browse Job Listings</Link></li>
          <li><Link to="/companies">Browse Companies</Link></li>
          <li>Resume Management & Parsing</li>
          <li>Application Status Tracking</li>
          <li>Saved Favorite Jobs</li>
        </ul>
            <ResumeUpload />
      </div>
      ) : (
        <ul>
          {company && <li><Link to={`/companies/${company.id}`}>View My Company Page ({company.name})</Link></li>}
          <li><Link to="/recruiter/company">Edit Company Profile</Link></li>
          <li><Link to="/recruiter/jobs/new">Post New Job Listings</Link></li>
          <li><Link to="/recruiter/jobs">Manage My Job Postings</Link></li>
          <li><Link to="/jobs">View Active Job Listings</Link></li>
          <li>Screening Question Library</li>
          <li>Manage Candidate Applications</li>
        </ul>
      )}
    </div>
  );
}
