import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchJobMatch } from '../services/jobMatchService';
import CompatibilityProgressBadge from './CompatibilityProgressBadge';
import SkillGapAnalysisPanel from './SkillGapAnalysisPanel';

/**
 * JobMatchWidget (Task 9.3)
 * Self-contained widget that fetches and displays the 0-100% compatibility badge
 * and 2-3 bullet skill gap analysis for a job posting.
 */
export default function JobMatchWidget({ jobId }) {
  const { user, token } = useAuth();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [missingProfile, setMissingProfile] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isJobSeeker = !user || user.role === 'Job Seeker';

  useEffect(() => {
    let isMounted = true;

    async function loadMatch() {
      if (!jobId || !token || !isJobSeeker) return;
      setLoading(true);
      setMissingProfile(false);

      try {
        const res = await fetchJobMatch(jobId, token);
        if (isMounted && res && res.match) {
          setMatch(res.match);
        }
      } catch (err) {
        if (isMounted && err && err.status === 400) {
          setMissingProfile(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadMatch();

    return () => {
      isMounted = false;
    };
  }, [jobId, token, isJobSeeker]);

  if (!isJobSeeker) {
    return null;
  }

  if (missingProfile) {
    return (
      <div
        style={{
          display: 'inline-block',
          padding: '0.4rem 0.7rem',
          borderRadius: '6px',
          backgroundColor: '#f1f5f9',
          border: '1px solid #cbd5e1',
          fontSize: '0.78rem',
          color: '#475569'
        }}
      >
        <Link to="/dashboard" style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}>
          Upload Resume
        </Link>{' '}
        for AI Match %
      </div>
    );
  }

  return (
    <div>
      <CompatibilityProgressBadge
        score={match ? match.matchScore : undefined}
        loading={loading}
        expanded={expanded}
        onToggleDetails={match ? () => setExpanded((prev) => !prev) : undefined}
      />

      {expanded && match && (
        <SkillGapAnalysisPanel
          summaryBullets={match.summaryBullets}
          matchedSkills={match.matchedSkills}
          missingSkills={match.missingSkills}
        />
      )}
    </div>
  );
}
