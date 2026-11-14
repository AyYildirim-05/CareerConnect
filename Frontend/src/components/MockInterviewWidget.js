import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import MockInterviewModal from './MockInterviewModal';

/**
 * MockInterviewWidget (Task 11.3)
 * Self-contained button and modal launcher for starting an automated mock interview
 * on a job posting. Only rendered for Job Seekers and called by JobCard.
 */
export default function MockInterviewWidget({ job }) {
  const { user, token } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isJobSeeker = !user || user.role === 'Job Seeker';
  if (!isJobSeeker || !job || !job.id) {
    return null;
  }

  return (
    <div style={{ marginTop: '0.6rem' }}>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          padding: '0.5rem 0.95rem',
          fontSize: '0.84rem',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.15)'
        }}
      >
        <span>Start Mock Interview</span>
      </button>

      <MockInterviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        job={job}
        token={token}
      />
    </div>
  );
}
