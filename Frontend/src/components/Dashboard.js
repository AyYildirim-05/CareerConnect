import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  const isSeeker = user.role === 'Job Seeker';

  return (
    <div>
      <h1>Welcome, {user.email}</h1>
      <p>Role: {user.role}</p>

      <h3>{isSeeker ? 'Job Seeker Tools' : 'Recruiter Tools'}</h3>
      {isSeeker ? (
        <ul>
          <li>Resume Management & Parsing</li>
          <li>Application Status Tracking</li>
          <li>Saved Favorite Jobs</li>
        </ul>
      ) : (
        <ul>
          <li>Post New Job Listings</li>
          <li>Screening Question Library</li>
          <li>Manage Candidate Applications</li>
        </ul>
      )}
    </div>
  );
}
