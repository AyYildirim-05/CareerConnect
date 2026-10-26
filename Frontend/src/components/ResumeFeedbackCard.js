import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestResumeFeedback } from '../services/resumeService';

const ROLE_OPTIONS = [
  'Frontend Developer',
  'Backend Engineer',
  'Full Stack Developer',
  'Data Scientist / ML Engineer',
  'DevOps / Cloud Engineer',
  'Mobile Developer',
  'Custom Role...'
];

export default function ResumeFeedbackCard() {
  const { token } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(ROLE_OPTIONS[0]);
  const [customRole, setCustomRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);

  const effectiveRole =
    selectedCategory === 'Custom Role...' ? customRole.trim() : selectedCategory;

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setError('');

    if (!effectiveRole || effectiveRole.length < 2) {
      setError('Please enter or select a valid target job role.');
      return;
    }

    setLoading(true);
    try {
      const response = await requestResumeFeedback({
        targetRole: effectiveRole,
        token
      });
      setFeedback(response.feedback);
    } catch (err) {
      setError(
        err.message ||
          'Could not generate feedback. Make sure you have saved a resume to your profile first.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="resume-feedback-card">
      <div className="resume-feedback-header">
        <div>
          <h2>AI Resume Feedback &amp; Keyword Analyzer</h2>
          <p>
            Evaluate your resume against target roles to uncover strengths, missing ATS keywords,
            and actionable revisions.
          </p>
        </div>
        <span className="resume-feedback-badge">
          {feedback?.provider === 'gemini'
            ? '✨ Powered by Google Gemini'
            : feedback?.provider === 'heuristic-analyzer'
            ? '⚡ Local Heuristic Analyzer'
            : 'GenAI Powered'}
        </span>
      </div>

      <form className="resume-feedback-form" onSubmit={handleAnalyze}>
        <div className="feedback-field">
          <label htmlFor="target-role-select">Target Job Role / Category</label>
          <select
            id="target-role-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          {selectedCategory === 'Custom Role...' && (
            <input
              type="text"
              placeholder="e.g., Cybersecurity Analyst, QA Engineer"
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
              maxLength={100}
            />
          )}
        </div>

        <button
          type="submit"
          className="feedback-submit-btn"
          disabled={loading}
        >
          {loading ? 'Analyzing...' : 'Get AI Feedback'}
        </button>
      </form>

      {error && <div className="feedback-error">{error}</div>}

      {feedback && (
        <div className="feedback-results">
          <div className="feedback-section strengths">
            <h4>Strengths for {feedback.targetRole}</h4>
            <ul className="feedback-list">
              {(feedback.strengths || []).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="feedback-section keywords">
            <h4>Missing Keywords</h4>
            <div className="keyword-chips">
              {(feedback.missingKeywords || []).map((kw, idx) => (
                <span key={idx} className="keyword-chip">
                  + {kw}
                </span>
              ))}
            </div>
          </div>

          <div className="feedback-section revisions">
            <h4>Actionable Revisions</h4>
            <ul className="feedback-list">
              {(feedback.actionableRevisions || []).map((rev, idx) => (
                <li key={idx}>{rev}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
