import React from 'react';

/**
 * Determine color palette and label based on 0-100% compatibility score
 * @param {number} score
 */
function getScoreTheme(score) {
  if (score >= 75) {
    return {
      barColor: '#16a34a',
      bgColor: '#f0fdf4',
      borderColor: '#bbf7d0',
      textColor: '#15803d',
      label: 'Strong Match'
    };
  }
  if (score >= 45) {
    return {
      barColor: '#d97706',
      bgColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
      label: 'Moderate Match'
    };
  }
  return {
    barColor: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    textColor: '#b91c1c',
    label: 'Skill Gaps'
  };
}

/**
 * CompatibilityProgressBadge (Task 9.3)
 * Displays a 0-100% AI match score badge and visual progress bar next to a job posting.
 */
export default function CompatibilityProgressBadge({
  score,
  loading = false,
  expanded = false,
  onToggleDetails
}) {
  if (loading) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.75rem',
          borderRadius: '8px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          fontSize: '0.82rem',
          color: '#64748b'
        }}
      >
        <span>Calculating AI Match...</span>
      </div>
    );
  }

  if (typeof score !== 'number' || Number.isNaN(score)) {
    return null;
  }

  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const theme = getScoreTheme(normalizedScore);

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: '0.35rem',
        padding: '0.55rem 0.85rem',
        borderRadius: '8px',
        backgroundColor: theme.bgColor,
        border: `1px solid ${theme.borderColor}`,
        minWidth: '185px'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem'
        }}
      >
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: '600',
            color: theme.textColor
          }}
        >
          AI Match: {normalizedScore}%
        </span>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: '600',
            color: theme.textColor,
            backgroundColor: '#ffffff',
            padding: '0.1rem 0.45rem',
            borderRadius: '999px',
            border: `1px solid ${theme.borderColor}`
          }}
        >
          {theme.label}
        </span>
      </div>

      {/* Progress Bar */}
      <div
        role="progressbar"
        aria-valuenow={normalizedScore}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Job compatibility match ${normalizedScore}%`}
        style={{
          width: '100%',
          height: '7px',
          backgroundColor: '#e2e8f0',
          borderRadius: '999px',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: `${normalizedScore}%`,
            height: '100%',
            backgroundColor: theme.barColor,
            borderRadius: '999px',
            transition: 'width 0.35s ease-out'
          }}
        />
      </div>

      {onToggleDetails && (
        <button
          type="button"
          onClick={onToggleDetails}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            marginTop: '0.1rem',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: theme.textColor,
            cursor: 'pointer',
            textAlign: 'left',
            textDecoration: 'underline'
          }}
        >
          {expanded ? 'Hide Gap Analysis ▲' : 'View Gap Analysis ▼'}
        </button>
      )}
    </div>
  );
}
