import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { submitApplication } from '../services/applicationService';

// Button for job seekers to apply using their profile resume
export default function ApplyButton({ jobId, initiallyApplied = false, onApplied }) {
  const [applied, setApplied] = useState(initiallyApplied);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { user, token } = useAuth();

  useEffect(() => {
    setApplied(initiallyApplied);
  }, [initiallyApplied]);

  // Only job seekers can apply
  if (!user || user.role !== 'Job Seeker') {
    return null;
  }

  const handleApply = async () => {
    if (applied || busy) return;

    setBusy(true);
    setErrorMessage('');
    try {
      await submitApplication(token, jobId);
      setApplied(true);
      if (onApplied) {
        onApplied(jobId);
      }
    } catch (err) {
      const msg = err.message || 'Failed to apply.';
      setErrorMessage(msg);
      alert(`Application Error: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  if (applied) {
    return (
      <button
        type="button"
        disabled
        style={{
          backgroundColor: '#e2e8f0',
          color: '#475569',
          border: '1px solid #cbd5e1',
          borderRadius: '4px',
          padding: '0.35rem 0.65rem',
          fontSize: '0.85rem',
          fontWeight: '500',
          cursor: 'default'
        }}
        title="You have already applied for this position"
      >
        Applied ✓
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleApply}
      disabled={busy}
      title={errorMessage || 'Submit application with your profile resume'}
      style={{
        backgroundColor: '#2563eb',
        color: '#ffffff',
        border: 'none',
        borderRadius: '4px',
        padding: '0.35rem 0.65rem',
        fontSize: '0.85rem',
        fontWeight: '500',
        cursor: busy ? 'wait' : 'pointer'
      }}
    >
      {busy ? 'Applying...' : '1-Click Apply'}
    </button>
  );
}
