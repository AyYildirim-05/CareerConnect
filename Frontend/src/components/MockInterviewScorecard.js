import React, { useState } from 'react';
import { exportJsonFile } from '../services/resumeService';

const CRITERIA = [
  {
    key: 'clarity',
    label: 'Clarity',
    weight: '33.3%',
    hint: 'How organized, concise, and easy to follow your answers were (3–5 clear sentences).'
  },
  {
    key: 'relevance',
    label: 'Relevance',
    weight: '33.3%',
    hint: 'How directly you addressed the question prompt, focus area, and target role requirements.'
  },
  {
    key: 'technicalDepth',
    label: 'Technical Depth / STAR',
    weight: '33.3%',
    hint: 'Specific tools, trade-offs, and metrics for technical prompts; full Situation-Task-Action-Result coverage for behavioral.'
  }
];

export const GRADING_BANDS = [
  {
    grade: 'A',
    range: '85 – 100',
    rating: 'Excellent',
    criteria: 'Clear structure, directly addresses role requirements, names concrete tools/trade-offs or all 4 STAR steps with measurable impact.'
  },
  {
    grade: 'B',
    range: '70 – 84',
    rating: 'Strong',
    criteria: 'Well-organized and relevant answer with solid domain understanding; minor room for deeper metrics or trade-off comparisons.'
  },
  {
    grade: 'C',
    range: '50 – 69',
    rating: 'Developing',
    criteria: 'Partially answers the prompt but lacks depth, trade-offs, or complete STAR steps. Scores below 60 unlock a tailored AI Better Answer.'
  },
  {
    grade: 'D / F',
    range: '0 – 49',
    rating: 'Needs Work',
    criteria: 'Very brief (<30 words), off-topic, or unanswered (0/100). Requires structured expansion and concrete examples.'
  }
];

export function getLetterGrade(score) {
  const n = Number(score) || 0;
  if (n >= 85) return 'A';
  if (n >= 70) return 'B';
  if (n >= 50) return 'C';
  if (n >= 35) return 'D';
  return 'F';
}

// Same thresholds as CompatibilityProgressBadge so the app looks consistent
function getTheme(score) {
  if (score >= 75) return { bar: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' };
  if (score >= 45) return { bar: '#d97706', bg: '#fffbeb', border: '#fde68a', text: '#b45309' };
  return { bar: '#dc2626', bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' };
}

/**
 * GradingSchematicPanel
 * Displays the structured grading schematic (criteria weights + score tiers/letter grades)
 * for the mock interview questionnaire.
 */
export function GradingSchematicPanel() {
  return (
    <div>
      <h4>Mock Interview Grading Schematic (100-Point Rubric)</h4>
      <p>
        Each question is scored from 0–100 across 3 equal criteria. Questions scoring below 60/100 automatically receive a tailored model answer.
      </p>

      <ul>
        {CRITERIA.map((c) => (
          <li key={c.key}>
            <strong>{c.label} (Weight: {c.weight}):</strong> {c.hint}
          </li>
        ))}
      </ul>

      <ul>
        {GRADING_BANDS.map((b) => (
          <li key={b.grade}>
            <strong>Grade {b.grade} · {b.rating} ({b.range} pts):</strong> {b.criteria}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScoreBar({ label, score, hint, rating }) {
  const t = getTheme(score);
  return (
    <div style={{ marginBottom: '0.8rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
        <span title={hint}>{label}</span>
        <span style={{ color: t.text }}>{score}/100{rating ? ` · ${rating}` : ''}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} ${score} out of 100`}
        style={{ height: 8, backgroundColor: '#e2e8f0', borderRadius: 999, overflow: 'hidden', marginTop: 4 }}
      >
        <div style={{ width: `${score}%`, height: '100%', backgroundColor: t.bar, transition: 'width 0.35s ease-out' }} />
      </div>
      {hint && <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function BulletBox({ title, items, color }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ flex: '1 1 220px', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.8rem 1rem', backgroundColor: '#fff' }}>
      <div style={{ fontWeight: 700, fontSize: '0.88rem', color, marginBottom: 6 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.84rem', color: '#334155', lineHeight: 1.5 }}>
        {items.map((item, i) => <li key={i} style={{ marginBottom: 4 }}>{item}</li>)}
      </ul>
    </div>
  );
}

/** Plain-text version of the critique, used for the download */
export function buildCritiqueText(interview, evaluation) {
  const lines = [];
  lines.push(`Mock Interview Critique: ${interview?.jobTitle || 'Target Role'}${interview?.companyName ? ` at ${interview.companyName}` : ''}`);
  lines.push(`Overall score: ${evaluation.overallScore}/100 (${evaluation.rating})`);
  CRITERIA.forEach((c) => lines.push(`  ${c.label}: ${evaluation.criteria[c.key].score}/100`));
  if (evaluation.summary) lines.push('', evaluation.summary);
  const section = (title, items) => { if (items?.length) { lines.push('', title); items.forEach((i) => lines.push(`  - ${i}`)); } };
  section('Strengths', evaluation.strengths);
  section('Communication gaps', evaluation.communicationGaps);
  section('How to improve', evaluation.improvementTips);
  lines.push('', 'Question breakdown');
  (evaluation.questionFeedback || []).forEach((q) => {
    lines.push('', `Q${q.questionNumber}. ${q.question}`);
    lines.push(`  Score ${q.overall}/100 (Clarity ${q.scores.clarity}, Relevance ${q.scores.relevance}, Technical Depth ${q.scores.technicalDepth})`);
    (q.critique || []).forEach((c) => lines.push(`  - ${c}`));
    if (q.betterAnswer) lines.push(`  Better answer: ${q.betterAnswer}`);
  });
  return lines.join('\n');
}

function downloadText(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * MockInterviewScorecard (Task 12.3)
 * Overall score, criteria ratings with progress bars, strengths / gaps / tips,
 * per-question critique with "Better Answer" suggestions, download and save actions.
 */
export default function MockInterviewScorecard({
  interview,
  evaluation,
  saved = false,
  saving = false,
  evaluating = false,
  onToggleSave,
  onReEvaluate
}) {
  const [openQ, setOpenQ] = useState(null);
  const [showSchematic, setShowSchematic] = useState(false);
  if (!evaluation) return null;

  const overall = getTheme(evaluation.overallScore);
  const overallLetter = getLetterGrade(evaluation.overallScore);
  const slug = (interview?.jobTitle || 'session').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  const answers = {};
  (interview?.transcript || []).forEach((e) => { answers[e.questionNumber] = e.response; });

  const btn = { padding: '0.45rem 0.85rem', borderRadius: 6, border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#0f172a', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' };

  return (
    <div>
      {/* Overall score + criteria */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ flex: '0 0 190px', textAlign: 'center', padding: '1rem', borderRadius: 12, backgroundColor: overall.bg, border: `1px solid ${overall.border}` }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: overall.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Overall Score</div>
          <div style={{ fontSize: '3rem', fontWeight: 800, color: overall.text, lineHeight: 1.1 }}>{evaluation.overallScore}</div>
          <div style={{ fontSize: '0.8rem', color: overall.text, fontWeight: 600 }}>Grade {overallLetter} · {evaluation.rating}</div>
          <div
            role="progressbar"
            aria-valuenow={evaluation.overallScore}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Overall score ${evaluation.overallScore} out of 100`}
            style={{ height: 8, backgroundColor: '#ffffff', borderRadius: 999, overflow: 'hidden', marginTop: 10 }}
          >
            <div style={{ width: `${evaluation.overallScore}%`, height: '100%', backgroundColor: overall.bar, transition: 'width 0.35s ease-out' }} />
          </div>
        </div>

        <div style={{ flex: '1 1 280px' }}>
          {CRITERIA.map((c) => (
            <ScoreBar key={c.key} label={`${c.label} (${c.weight})`} hint={c.hint} score={evaluation.criteria[c.key].score} rating={evaluation.criteria[c.key].rating} />
          ))}
        </div>
      </div>

      {/* Collapsible Grading Schematic inside Scorecard */}
      <div>
        <button
          type="button"
          onClick={() => setShowSchematic((prev) => !prev)}
        >
          {showSchematic ? 'Hide Grading Schematic' : 'View Grading Schematic & Score Rubric'}
        </button>
        {showSchematic && <GradingSchematicPanel />}
      </div>

      {evaluation.summary && <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#334155', lineHeight: 1.55 }}>{evaluation.summary}</p>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <BulletBox title="Strengths" items={evaluation.strengths} color="#15803d" />
        <BulletBox title="Communication Gaps" items={evaluation.communicationGaps} color="#b45309" />
        <BulletBox title="How to Improve" items={evaluation.improvementTips} color="#1d4ed8" />
      </div>

      {/* Per-question breakdown */}
      <h4 style={{ margin: '0 0 0.5rem', color: '#0f172a' }}>Question Breakdown</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
        {(evaluation.questionFeedback || []).map((q) => {
          const t = getTheme(q.overall);
          const qGrade = getLetterGrade(q.overall);
          const isOpen = openQ === q.questionNumber;
          return (
            <div key={q.questionNumber} style={{ border: '1px solid #e2e8f0', borderRadius: 10, backgroundColor: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => setOpenQ(isOpen ? null : q.questionNumber)}
                aria-expanded={isOpen}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.7rem 0.9rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}
              >
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>
                  Q{q.questionNumber}{q.focusArea ? ` · ${q.focusArea}` : ''}
                  <span style={{ display: 'block', fontWeight: 400, color: '#475569', marginTop: 2 }}>{q.question}</span>
                </span>
                <span style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 999, backgroundColor: t.bg, color: t.text, border: `1px solid ${t.border}` }}>
                  Grade {qGrade} · {q.overall}/100 {isOpen ? '▲' : '▼'}
                </span>
              </button>

              {isOpen && (
                <div style={{ padding: '0 0.9rem 0.9rem' }}>
                  {CRITERIA.map((c) => <ScoreBar key={c.key} label={c.label} score={q.scores[c.key]} />)}
                  <ul style={{ margin: '0 0 0.6rem', paddingLeft: '1.1rem', fontSize: '0.84rem', color: '#334155', lineHeight: 1.5 }}>
                    {q.critique.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.6rem' }}>
                    <strong>Your answer:</strong> {answers[q.questionNumber]?.trim() || 'No answer provided.'}
                  </div>
                  {q.betterAnswer && (
                    <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.7rem 0.85rem', fontSize: '0.85rem', color: '#1e3a8a', lineHeight: 1.55 }}>
                      <strong>💡 Better Answer:</strong> {q.betterAnswer}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {onToggleSave && (
          <button type="button" onClick={onToggleSave} disabled={saving} style={{ ...btn, backgroundColor: saved ? '#f0fdf4' : '#2563eb', color: saved ? '#166534' : '#fff', borderColor: saved ? '#86efac' : '#2563eb' }}>
            {saving ? 'Saving...' : saved ? '✓ Saved to Dashboard (click to remove)' : '💾 Save to Dashboard'}
          </button>
        )}
        <button type="button" style={btn} onClick={() => downloadText(buildCritiqueText(interview, evaluation), `mock_interview_critique_${slug}.txt`)}>
          ⬇ Download (.txt)
        </button>
        <button type="button" style={btn} onClick={() => exportJsonFile({ interview: { id: interview?.id, jobTitle: interview?.jobTitle, companyName: interview?.companyName }, evaluation }, `mock_interview_critique_${slug}.json`)}>
          ⬇ Download (.json)
        </button>
        {onReEvaluate && (
          <button type="button" style={btn} onClick={onReEvaluate} disabled={evaluating}>
            {evaluating ? 'Re-evaluating...' : '↻ Re-evaluate'}
          </button>
        )}
      </div>
    </div>
  );
}
