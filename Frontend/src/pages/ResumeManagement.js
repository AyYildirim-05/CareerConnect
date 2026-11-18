
import React from 'react';
import { useAuth } from '../context/AuthContext';

import ResumeUpload from '../components/ResumeUpload';
import ResumeFeedbackCard from '../components/ResumeFeedbackCard';
import SavedCritiques from '../components/SavedCritiques';

export default function ResumeManagement() {
  const { user } = useAuth();

  if (!user || user.role !== 'Job Seeker') {
    return (
      <main className="cc-page">
        <p role="alert">Access denied.</p>
      </main>
    );
  }

  return (
    <main className="cc-page cc-resume-page">
      <header className="cc-resume-header">
        <h1 className="cc-page-title">
          Resume Management & Parsing
        </h1>

        <p className="cc-muted">
          Upload, parse, and manage your resume information.
        </p>
      </header>

      <div className="cc-resume-layout">
        <section
          className="cc-card cc-section cc-resume-section"
          aria-label="Resume Upload and Parsing"
        >
          <ResumeUpload />
        </section>

        <section
          className="cc-card cc-section cc-resume-section"
          aria-label="AI Resume Feedback"
        >
          <ResumeFeedbackCard />
        </section>

        <section
          className="cc-card cc-section cc-resume-section"
          aria-label="Saved Resume Critiques"
        >
          <SavedCritiques />
        </section>
      </div>
    </main>
  );
}
