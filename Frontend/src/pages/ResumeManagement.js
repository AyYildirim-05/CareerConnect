
import React from 'react';
import { useAuth } from '../context/AuthContext';

import ResumeUpload from '../components/ResumeUpload';
import ResumeFeedbackCard from '../components/ResumeFeedbackCard';


export default function ResumeManagement() {
  const { user } = useAuth();

  if (!user || user.role !== 'Job Seeker') {
    return <p>Access denied.</p>;
  }

  return (
    <main style={{
      maxWidth: '1100px',
      margin: '40px auto',
      padding: '24px'
    }}>
      <h1>Resume Management & Parsing</h1>
      <p>
        Upload, parse, and manage your resume information.
      </p>

      <ResumeUpload />
      <ResumeFeedbackCard />
    </main>
  );
}
