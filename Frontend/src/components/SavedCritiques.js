import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchSavedEvaluations, setEvaluationSaved } from '../services/mockInterviewService';
import MockInterviewScorecard from './MockInterviewScorecard';

/**
 * Dashboard card listing mock interview critiques the job seeker saved.
 */
export default function SavedCritiques() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetchSavedEvaluations(token)
      .then((res) => { if (alive) setItems(res.interviews || []); })
      .catch((err) => { if (alive) setError(err.error || err.message || 'Failed to load saved critiques.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  const remove = async (id) => {
    try {
      await setEvaluationSaved(id, false, token);
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (openId === id) setOpenId(null);
    } catch (err) {
      setError(err.error || err.message || 'Failed to remove critique.');
    }
  };

  if (loading) return null;
  if (!error && items.length === 0) return null;

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem', marginTop: '1.5rem', backgroundColor: '#fff' }}>
      <h3 style={{ marginTop: 0 }}>Saved Mock Interview Critiques</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {items.map((i) => (
        <div key={i.id} style={{ borderTop: '1px solid #f1f5f9', padding: '0.6rem 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div>
              <strong>{i.jobTitle || 'Mock Interview'}</strong>{i.companyName ? ` — ${i.companyName}` : ''}
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Score {i.evaluation.overallScore}/100 · {new Date(i.evaluatedAt).toLocaleDateString()}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button type="button" onClick={() => setOpenId(openId === i.id ? null : i.id)}>
                {openId === i.id ? 'Hide' : 'View Scorecard'}
              </button>
              <button type="button" onClick={() => remove(i.id)}>Remove</button>
            </div>
          </div>
          {openId === i.id && (
            <div style={{ marginTop: '0.75rem' }}>
              <MockInterviewScorecard interview={i} evaluation={i.evaluation} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
