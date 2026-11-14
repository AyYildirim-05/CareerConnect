import React, { useState, useEffect } from 'react';
import {
  startMockInterview,
  saveMockInterviewTranscript,
  addMockInterviewQuestion,
  evaluateMockInterview,
  setEvaluationSaved
} from '../services/mockInterviewService';
import MockInterviewScorecard, {
  GradingSchematicPanel,
  getLetterGrade
} from './MockInterviewScorecard';

/**
 * MockInterviewModal
 * Interactive pop-up modal page providing a step-by-step mock interview questionnaire
 * with tailored questions (technical/role-specific + behavioral STAR method),
 * ability to add new AI-generated or custom questions, and a 100-point grading schematic.
 */
export default function MockInterviewModal({ isOpen, onClose, job, token }) {
  const [interview, setInterview] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [showGradingSchematic, setShowGradingSchematic] = useState(false);

  // Add New Question state
  const [showAddQuestionPanel, setShowAddQuestionPanel] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [newQuestionCategory, setNewQuestionCategory] = useState('technical');
  const [newQuestionFocusArea, setNewQuestionFocusArea] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionHint, setNewQuestionHint] = useState('');

  // Evaluation state
  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [savingCritique, setSavingCritique] = useState(false);
  const [savedToDashboard, setSavedToDashboard] = useState(false);

  // Evaluate the completed mock interview session and generate a critique
  const handleEvaluate = async (force = false) => {
    if (!interview?.id) return;
    setEvaluating(true);
    setError('');
    try {
      const res = await evaluateMockInterview(interview.id, token, { force });
      setEvaluation(res.evaluation);
      setInterview(res.interview);
    } catch (err) {
      setError(err.error || err.message || 'Failed to evaluate your interview.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleToggleSaveCritique = async () => {
    setSavingCritique(true);
    try {
      const res = await setEvaluationSaved(interview.id, !savedToDashboard, token);
      setSavedToDashboard(res.saved);
    } catch (err) {
      setError(err.error || err.message || 'Failed to update saved critique.');
    } finally {
      setSavingCritique(false);
    }
  };

  // Load or generate the 5-question mock interview session when modal opens
  const loadInterviewSession = async (forceNew = false) => {
    if (!job || !job.id || !token) return;
    setLoading(true);
    setError('');
    setShowSummary(false);
    setShowAddQuestionPanel(false);

    try {
      const res = await startMockInterview(job.id, token, { forceNew });
      if (res && res.interview) {
        setInterview(res.interview);
        // Reset evaluation state for new or resumed session
        setEvaluation(res.interview.evaluation || null);
        setSavedToDashboard(Boolean(res.interview.savedToDashboard));
        // Initialize responses from the transcript if available
        const initialResponses = {};
        let firstUnansweredIdx = 0;
        let foundUnanswered = false;

        (res.interview.transcript || []).forEach((entry, idx) => {
          const qNum = Number(entry.questionNumber || idx + 1);
          initialResponses[qNum] = entry.response || '';
          if (!foundUnanswered && (!entry.response || !entry.response.trim())) {
            firstUnansweredIdx = idx;
            foundUnanswered = true;
          }
        });

        setResponses(initialResponses);
        setCurrentIndex(foundUnanswered ? firstUnansweredIdx : 0);
      }
    } catch (err) {
      setError(err.error || err.message || 'Failed to generate mock interview questions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadInterviewSession(false);
    }
  }, [isOpen, job?.id]);

  if (!isOpen) return null;

  const questions = interview?.questions || [];
  const currentQuestion = questions[currentIndex] || null;
  const currentQNum = currentQuestion ? Number(currentQuestion.questionNumber || currentIndex + 1) : currentIndex + 1;
  const currentAnswer = responses[currentQNum] || '';
  const isTechnical = currentQuestion ? currentQuestion.category === 'technical' : currentQNum <= 3;

  const technicalCount = questions.filter((q) => q.category === 'technical').length;
  const behavioralCount = questions.filter((q) => q.category === 'behavioral').length;

  const handleTextChange = (e) => {
    const val = e.target.value;
    setResponses((prev) => ({
      ...prev,
      [currentQNum]: val
    }));
  };

  // Persist current question response to backend
  const persistCurrentAnswer = async (nextStatus = undefined) => {
    if (!interview || !interview.id) return;
    setSaving(true);
    setError('');

    try {
      const updatedTranscript = questions.map((q, idx) => {
        const qNum = Number(q.questionNumber || idx + 1);
        const answerText = responses[qNum] || '';
        return {
          questionId: q.id || `q_${qNum}`,
          questionNumber: qNum,
          category: q.category,
          framework: q.framework,
          focusArea: q.focusArea,
          question: q.question,
          response: answerText,
          responseMode: 'text'
        };
      });

      const res = await saveMockInterviewTranscript(
        interview.id,
        {
          transcript: updatedTranscript,
          status: nextStatus
        },
        token
      );
      if (res && res.interview) {
        setInterview(res.interview);
      }
    } catch (err) {
      setError(err.error || err.message || 'Failed to save your response.');
    } finally {
      setSaving(false);
    }
  };

  const handleStepNavigation = async (targetIdx) => {
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    await persistCurrentAnswer();
    setCurrentIndex(targetIdx);
  };

  const handleCompleteInterview = async () => {
    await persistCurrentAnswer('completed');
    setShowSummary(true);
    const hasAnyResponse = Object.values(responses).some((r) => String(r || '').trim().length > 0);
    if (hasAnyResponse) {
      await handleEvaluate(true);
    }
  };

  // Generate or add a new question to the current questionnaire
  const handleAddQuestion = async ({ generate = false, categoryOverride = null } = {}) => {
    if (!interview?.id) return;
    const category = categoryOverride || newQuestionCategory || 'technical';

    if (!generate && !newQuestionText.trim()) {
      setError('Please enter a question prompt or click "Generate New Question".');
      return;
    }

    setAddingQuestion(true);
    setError('');
    try {
      await persistCurrentAnswer();
      const payload = generate
        ? { generate: true, category }
        : {
            generate: false,
            category,
            focusArea: newQuestionFocusArea.trim(),
            question: newQuestionText.trim(),
            hint: newQuestionHint.trim()
          };

      const res = await addMockInterviewQuestion(interview.id, payload, token);
      if (res && res.interview) {
        setInterview(res.interview);
        const newIdx = (res.interview.questions || []).length - 1;
        setNewQuestionText('');
        setNewQuestionFocusArea('');
        setNewQuestionHint('');
        setShowAddQuestionPanel(false);
        setShowSummary(false);
        if (newIdx >= 0) {
          setCurrentIndex(newIdx);
        }
      }
    } catch (err) {
      setError(err.error || err.message || 'Failed to add new question.');
    } finally {
      setAddingQuestion(false);
    }
  };

  const answeredCount = questions.filter((q, idx) => {
    const qNum = Number(q.questionNumber || idx + 1);
    return Boolean((responses[qNum] || '').trim());
  }).length;

  const questionScoreMap = {};
  (evaluation?.questionFeedback || []).forEach((qf) => {
    questionScoreMap[qf.questionNumber] = qf;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mock-interview-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.3)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.15rem 1.5rem',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                AI Mock Interview
              </span>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {technicalCount} Technical · {behavioralCount} Behavioral (STAR)
              </span>
            </div>
            <h2
              id="mock-interview-modal-title"
              style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#f8fafc' }}
            >
              {job?.title || 'Role Mock Interview'}
              {job?.companyName ? ` — ${job.companyName}` : ''}
            </h2>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowGradingSchematic((prev) => !prev)}
            >
              {showGradingSchematic ? 'Hide Grading Schematic' : 'Grading Schematic'}
            </button>

            <button
              type="button"
              onClick={() => setShowAddQuestionPanel((prev) => !prev)}
              disabled={loading || !interview}
            >
              + Add Question
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Mock Interview Modal"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                fontSize: '1.1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}
            >
              {error}
            </div>
          )}

          {/* Collapsible Grading Schematic Panel */}
          {showGradingSchematic && <GradingSchematicPanel />}

          {/* Collapsible Add New Question Panel */}
          {showAddQuestionPanel && interview && (
            <div>
              <div>
                <h4>+ Add New Question to Questionnaire (Q{questions.length + 1})</h4>
                <p>
                  Generate a new AI-tailored question from the job description or write your own custom question below.
                </p>
                <div>
                  <button
                    type="button"
                    disabled={addingQuestion}
                    onClick={() => handleAddQuestion({ generate: true, categoryOverride: 'technical' })}
                  >
                    {addingQuestion ? 'Generating...' : 'Generate New Technical Question'}
                  </button>
                  <button
                    type="button"
                    disabled={addingQuestion}
                    onClick={() => handleAddQuestion({ generate: true, categoryOverride: 'behavioral' })}
                  >
                    {addingQuestion ? 'Generating...' : 'Generate New Behavioral (STAR) Question'}
                  </button>
                </div>
              </div>

              {/* Custom Question Input Form */}
              <div>
                <div>Or Write a Custom Question:</div>
                <div>
                  <select
                    aria-label="New Question Category"
                    value={newQuestionCategory}
                    onChange={(e) => setNewQuestionCategory(e.target.value)}
                  >
                    <option value="technical">Technical / Role-Specific</option>
                    <option value="behavioral">Behavioral (STAR Method)</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Focus area (e.g., System Design, Conflict Resolution)"
                    value={newQuestionFocusArea}
                    onChange={(e) => setNewQuestionFocusArea(e.target.value)}
                  />
                </div>

                <textarea
                  rows={2}
                  placeholder="Enter your custom interview question prompt..."
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                />

                <div>
                  <input
                    type="text"
                    placeholder="Optional interviewer coaching hint..."
                    value={newQuestionHint}
                    onChange={(e) => setNewQuestionHint(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={addingQuestion}
                    onClick={() => handleAddQuestion({ generate: false })}
                  >
                    {addingQuestion ? 'Adding...' : '+ Add Custom Question'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#475569' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.4rem', color: '#0f172a' }}>
                Generating Tailored Interview Questions...
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                Analyzing job description & requirements for technical/role-specific and STAR behavioral prompts.
              </p>
            </div>
          ) : showSummary ? (
            /* Completed Transcript & Grading View */
            <div>
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', color: '#166534', fontSize: '1.05rem' }}>
                    Mock Interview Transcript Saved ({answeredCount}/{questions.length} Answered)
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#15803d' }}>
                    Grade your questionnaire responses against the 100-point rubric, add more questions, or start a fresh set.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleEvaluate(true)}
                    disabled={evaluating || answeredCount === 0}
                  >
                    {evaluating ? 'Grading...' : evaluation ? 'Re-Grade Questionnaire' : 'Grade Questionnaire'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSummary(false)}
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#166534',
                      border: '1px solid #86efac',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '6px',
                      fontWeight: '600',
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Edit Responses
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAddQuestionPanel((prev) => !prev)}
                  >
                    + Add Question
                  </button>

                  <button
                    type="button"
                    onClick={() => loadInterviewSession(true)}
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '6px',
                      fontWeight: '600',
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    New 5-Question Set
                  </button>
                </div>
              </div>

              {evaluation && (
                <div>
                  <h3>AI Evaluation Scorecard & Grading Breakdown</h3>
                  <MockInterviewScorecard
                    interview={interview}
                    evaluation={evaluation}
                    saved={savedToDashboard}
                    saving={savingCritique}
                    evaluating={evaluating}
                    onToggleSave={handleToggleSaveCritique}
                    onReEvaluate={() => handleEvaluate(true)}
                  />
                </div>
              )}

              {!evaluation && !showGradingSchematic && <GradingSchematicPanel />}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {questions.map((q, idx) => {
                  const qNum = Number(q.questionNumber || idx + 1);
                  const isTech = q.category === 'technical';
                  const ans = (responses[qNum] || '').trim();
                  const qEval = questionScoreMap[qNum];
                  const qLetter = qEval ? getLetterGrade(qEval.overall) : null;

                  return (
                    <div
                      key={q.id || qNum}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '1rem',
                        backgroundColor: '#f8fafc'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: '700',
                            padding: '0.15rem 0.55rem',
                            borderRadius: '999px',
                            backgroundColor: isTech ? '#dbeafe' : '#fae8ff',
                            color: isTech ? '#1d4ed8' : '#86198f'
                          }}
                        >
                          Q{qNum} · {isTech ? 'Technical / Role-Specific' : 'Behavioral (STAR Method)'}
                        </span>
                        {q.focusArea && (
                          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>
                            {q.focusArea}
                          </span>
                        )}
                        {qEval && (
                          <span>
                            Grade {qLetter} · {qEval.overall}/100 ({qEval.rating})
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '0 0 0.6rem 0', fontWeight: '600', color: '#0f172a', fontSize: '0.95rem' }}>
                        {q.question}
                      </p>
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          fontSize: '0.9rem',
                          color: ans ? '#1e293b' : '#94a3b8',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {ans || 'No written response submitted for this question.'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : currentQuestion ? (
            /* Step-by-Step Interactive Prompt Card */
            <div>
              {/* Step-by-Step Navigation Pills */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}
              >
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {questions.map((q, idx) => {
                    const qNum = Number(q.questionNumber || idx + 1);
                    const isCurrent = idx === currentIndex;
                    const isAnswered = Boolean((responses[qNum] || '').trim());
                    const isTech = q.category === 'technical';

                    return (
                      <button
                        key={q.id || qNum}
                        type="button"
                        onClick={() => handleStepNavigation(idx)}
                        style={{
                          padding: '0.4rem 0.75rem',
                          borderRadius: '8px',
                          border: isCurrent ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          backgroundColor: isCurrent
                            ? '#eff6ff'
                            : isAnswered
                            ? '#f0fdf4'
                            : '#ffffff',
                          color: isCurrent
                            ? '#1d4ed8'
                            : isAnswered
                            ? '#15803d'
                            : '#475569',
                          fontWeight: isCurrent ? '700' : '600',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <span>Q{qNum}</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>
                          ({isTech ? 'Tech' : 'STAR'})
                        </span>
                        {isAnswered && <span style={{ color: '#16a34a' }}>✓</span>}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setShowAddQuestionPanel((prev) => !prev)}
                    title="Add a new question to this mock interview"
                  >
                    + Question
                  </button>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600' }}>
                  Question {currentIndex + 1} of {questions.length} · {answeredCount}/{questions.length} Answered
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  marginBottom: '1.25rem'
                }}
              >
                <div
                  style={{
                    width: `${Math.round(((currentIndex + 1) / questions.length) * 100)}%`,
                    height: '100%',
                    backgroundColor: isTechnical ? '#2563eb' : '#9333ea',
                    transition: 'width 0.25s ease'
                  }}
                />
              </div>

              {/* Interactive Prompt Card */}
              <div
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  backgroundColor: '#f8fafc',
                  marginBottom: '1rem'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginBottom: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.76rem',
                        fontWeight: '700',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '999px',
                        backgroundColor: isTechnical ? '#dbeafe' : '#fae8ff',
                        color: isTechnical ? '#1d4ed8' : '#86198f'
                      }}
                    >
                      {isTechnical
                        ? `Technical / Role-Specific (Q${currentQNum})`
                        : `Behavioral — STAR Method (Q${currentQNum})`}
                    </span>

                    {currentQuestion.focusArea && (
                      <span
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: '600',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '999px',
                          backgroundColor: '#e2e8f0',
                          color: '#334155'
                        }}
                      >
                        {currentQuestion.focusArea}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowHint((prev) => !prev)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    {showHint ? 'Hide Coaching Guide ▲' : 'Show Coaching Guide ▼'}
                  </button>
                </div>

                {/* Question Text */}
                <p
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: '600',
                    color: '#0f172a',
                    lineHeight: '1.55',
                    margin: '0 0 1rem 0'
                  }}
                >
                  {currentQuestion.question}
                </p>

                {/* Coaching Hint / STAR Method Guide */}
                {showHint && (
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.75rem 0.9rem',
                      marginBottom: '1rem',
                      fontSize: '0.84rem',
                      color: '#334155'
                    }}
                  >
                    {currentQuestion.hint && (
                      <div style={{ marginBottom: currentQuestion.starGuide ? '0.5rem' : 0 }}>
                        <strong>Interviewer Tip:</strong> {currentQuestion.hint}
                      </div>
                    )}

                    {currentQuestion.starGuide && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                          gap: '0.5rem',
                          marginTop: '0.4rem'
                        }}
                      >
                        <div style={{ backgroundColor: '#faf5ff', padding: '0.45rem 0.6rem', borderRadius: '6px' }}>
                          <strong style={{ color: '#7e22ce' }}>S — Situation:</strong>
                          <div style={{ fontSize: '0.78rem', marginTop: '0.15rem' }}>
                            {currentQuestion.starGuide.situation}
                          </div>
                        </div>
                        <div style={{ backgroundColor: '#faf5ff', padding: '0.45rem 0.6rem', borderRadius: '6px' }}>
                          <strong style={{ color: '#7e22ce' }}>T — Task:</strong>
                          <div style={{ fontSize: '0.78rem', marginTop: '0.15rem' }}>
                            {currentQuestion.starGuide.task}
                          </div>
                        </div>
                        <div style={{ backgroundColor: '#faf5ff', padding: '0.45rem 0.6rem', borderRadius: '6px' }}>
                          <strong style={{ color: '#7e22ce' }}>A — Action:</strong>
                          <div style={{ fontSize: '0.78rem', marginTop: '0.15rem' }}>
                            {currentQuestion.starGuide.action}
                          </div>
                        </div>
                        <div style={{ backgroundColor: '#faf5ff', padding: '0.45rem 0.6rem', borderRadius: '6px' }}>
                          <strong style={{ color: '#7e22ce' }}>R — Result:</strong>
                          <div style={{ fontSize: '0.78rem', marginTop: '0.15rem' }}>
                            {currentQuestion.starGuide.result}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Written Response Input */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <label
                    htmlFor={`mock-interview-response-${currentQNum}`}
                    style={{ fontWeight: '600', fontSize: '0.88rem', color: '#1e293b' }}
                  >
                    Your Written Response:
                  </label>
                  <span>
                    {' '}(Graded on Clarity 33.3%, Relevance 33.3%, and {isTechnical ? 'Technical Depth' : 'STAR Method'} 33.3%)
                  </span>
                </div>

                <textarea
                  id={`mock-interview-response-${currentQNum}`}
                  rows={5}
                  value={currentAnswer}
                  onChange={handleTextChange}
                  placeholder={
                    isTechnical
                      ? 'Type your technical explanation here...'
                      : 'Structure your written response using Situation, Task, Action, and Result (STAR)...'
                  }
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer: Step-by-Step Navigation */}
        {!loading && !showSummary && questions.length > 0 && (
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            <button
              type="button"
              onClick={() => handleStepNavigation(currentIndex - 1)}
              disabled={currentIndex === 0 || saving}
              style={{
                backgroundColor: currentIndex === 0 ? '#f1f5f9' : '#ffffff',
                color: currentIndex === 0 ? '#94a3b8' : '#0f172a',
                border: '1px solid #cbd5e1',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.88rem',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Previous Question
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowSummary(true)}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '0.55rem 0.95rem',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                View Transcript & Grading
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => handleStepNavigation(currentIndex + 1)}
                  disabled={saving}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.55rem 1.15rem',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.88rem',
                    cursor: saving ? 'wait' : 'pointer'
                  }}
                >
                  {saving ? 'Saving...' : 'Save & Next Question →'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCompleteInterview}
                  disabled={saving || evaluating}
                  style={{
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.55rem 1.2rem',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    cursor: saving || evaluating ? 'wait' : 'pointer'
                  }}
                >
                  {saving || evaluating ? 'Grading...' : 'Finish & Grade Questionnaire ✓'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
