import React from 'react';

/**
 * SkillGapAnalysisPanel (Task 9.3)
 * Renders the 2-3 bullet summary highlighting matched skills and skill gaps,
 * alongside visual chips for matched and missing qualifications.
 */
export default function SkillGapAnalysisPanel({
  summaryBullets = [],
  matchedSkills = [],
  missingSkills = []
}) {
  const bullets = Array.isArray(summaryBullets) ? summaryBullets.slice(0, 3) : [];

  return (
    <div
      style={{
        marginTop: '0.75rem',
        padding: '0.9rem 1rem',
        backgroundColor: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        fontSize: '0.9rem',
        color: '#1e293b'
      }}
    >
      <div
        style={{
          fontWeight: '700',
          fontSize: '0.88rem',
          color: '#0f172a',
          marginBottom: '0.45rem'
        }}
      >
        AI Compatibility & Skill Gap Summary
      </div>

      {/* 2-3 Bullet Summary */}
      {bullets.length > 0 && (
        <ul style={{ margin: '0 0 0.75rem 1.2rem', padding: 0, lineHeight: '1.5' }}>
          {bullets.map((bullet, idx) => (
            <li key={idx} style={{ marginBottom: '0.25rem' }}>
              {bullet}
            </li>
          ))}
        </ul>
      )}

      {/* Matched & Missing Skill Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        {Array.isArray(matchedSkills) && matchedSkills.length > 0 && (
          <div style={{ flex: '1 1 220px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: '600', color: '#15803d', marginBottom: '0.3rem' }}>
              Matched Skills ({matchedSkills.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {matchedSkills.map((skill) => (
                <span
                  key={skill}
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    fontWeight: '500'
                  }}
                >
                  ✓ {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(missingSkills) && missingSkills.length > 0 && (
          <div style={{ flex: '1 1 220px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: '600', color: '#b45309', marginBottom: '0.3rem' }}>
              Skill Gaps ({missingSkills.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {missingSkills.map((skill) => (
                <span
                  key={skill}
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    fontWeight: '500'
                  }}
                >
                  + {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
