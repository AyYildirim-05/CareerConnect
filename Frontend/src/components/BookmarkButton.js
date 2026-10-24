import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { saveJob, unsaveJob } from '../services/jobService';

/**
 * Toggle button that saves / un-saves a job for the logged-in user.
 * initiallySaved is only read on first render.
 */
export default function BookmarkButton({ jobId, initiallySaved = false, onChange }) {
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);
  const { token } = useAuth();

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const next = !saved;
    try {
      await (next ? saveJob(jobId, token) : unsaveJob(jobId, token));
      setSaved(next);
      if (onChange) onChange(next);
    } catch (err) {
      console.error('Bookmark failed:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved jobs' : 'Save job'}
      title={saved ? 'Remove from saved jobs' : 'Save job'}
    >
      {saved ? '★ Saved' : '☆ Save'}
    </button>
  );
}