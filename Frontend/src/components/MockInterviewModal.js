import React, { useState, useEffect, useRef } from 'react';
import { startMockInterview, 
  saveMockInterviewTranscript, 
  evaluateMockInterview, 
  setEvaluationSaved 
} 
from '../services/mockInterviewService';
import MockInterviewScorecard from './MockInterviewScorecard';


/**
 * MockInterviewModal (Task 11.3)
 * Interactive pop-up modal page providing a step-by-step mock interview session
 * with 5 tailored questions (3 technical/role-specific + 2 behavioral STAR method)
 * where the job seeker types or records responses sequentially in an interactive prompt card.
 */
export default function MockInterviewModal({ isOpen, onClose, job, token }) {
  const [interview, setInterview] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [responseModes, setResponseModes] = useState({});
  const [audioUrls, setAudioUrls] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [showHint, setShowHint] = useState(true);

  // Evaluation state
  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [savingCritique, setSavingCritique] = useState(false);
  const [savedToDashboard, setSavedToDashboard] = useState(false);


  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingNotice, setRecordingNotice] = useState('');

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const stopAllRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  // Evaluate the completed mock interview session and generate a critique
  const handleEvaluate = async (force = false) => {
  if (!interview?.id) return;
  setEvaluating(true); setError('');
  try {
    const res = await evaluateMockInterview(interview.id, token, { force });
    setEvaluation(res.evaluation);
    setInterview(res.interview);
  } catch (err) {
    setError(err.error || err.message || 'Failed to evaluate your interview.');
  } finally { setEvaluating(false); }
};
const handleToggleSaveCritique = async () => {
  setSavingCritique(true);
  try {
    const res = await setEvaluationSaved(interview.id, !savedToDashboard, token);
    setSavedToDashboard(res.saved);
  } catch (err) {
    setError(err.error || err.message || 'Failed to update saved critique.');
  } finally { setSavingCritique(false); }
};

  // Load or generate the 5-question mock interview session when modal opens
  const loadInterviewSession = async (forceNew = false) => {
    if (!job || !job.id || !token) return;
    stopAllRecording();
    setLoading(true);
    setError('');
    setShowSummary(false);

    try {
      const res = await startMockInterview(job.id, token, { forceNew });
      if (res && res.interview) {
        setInterview(res.interview);
        // Reset evaluation state for new or resumed session
        setEvaluation(res.interview.evaluation || null);
        setSavedToDashboard(Boolean(res.interview.savedToDashboard));
        // Initialize responses and response modes from the transcript if available
        const initialResponses = {};
        const initialModes = {};
        let firstUnansweredIdx = 0;
        let foundUnanswered = false;

        (res.interview.transcript || []).forEach((entry, idx) => {
          const qNum = Number(entry.questionNumber || idx + 1);
          initialResponses[qNum] = entry.response || '';
          initialModes[qNum] = entry.responseMode || 'text';
          if (!foundUnanswered && (!entry.response || !entry.response.trim())) {
            firstUnansweredIdx = idx;
            foundUnanswered = true;
          }
        });

        setResponses(initialResponses);
        setResponseModes(initialModes);
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
    } else {
      stopAllRecording();
    }
    return () => {
      stopAllRecording();
    };
  }, [isOpen, job?.id]);

  if (!isOpen) return null;

  const questions = interview?.questions || [];
  const currentQuestion = questions[currentIndex] || null;
  const currentQNum = currentQuestion ? Number(currentQuestion.questionNumber || currentIndex + 1) : currentIndex + 1;
  const currentAnswer = responses[currentQNum] || '';
  const isTechnical = currentQuestion ? currentQuestion.category === 'technical' : currentQNum <= 3;

  const handleTextChange = (e) => {
    const val = e.target.value;
    setResponses((prev) => ({
      ...prev,
      [currentQNum]: val
    }));
    if (!responseModes[currentQNum]) {
      setResponseModes((prev) => ({ ...prev, [currentQNum]: 'text' }));
    }
  };

  // Toggle voice recording (Web Speech API live transcription + MediaRecorder audio capture)
  const handleToggleRecording = async () => {
    setRecordingNotice('');

    if (isRecording) {
      stopAllRecording();
      return;
    }

    const qNumAtStart = currentQNum;
    setIsRecording(true);
    setRecordingSeconds(0);
    setResponseModes((prev) => ({ ...prev, [qNumAtStart]: 'voice' }));

    timerRef.current = setInterval(() => {
      setRecordingSeconds((sec) => sec + 1);
    }, 1000);

    // 1. SpeechRecognition for live voice-to-text into the prompt card
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let newTranscriptChunk = '';
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            if (event.results[i].isFinal) {
              newTranscriptChunk += `${event.results[i][0].transcript.trim()} `;
            }
          }
          if (newTranscriptChunk.trim()) {
            setResponses((prev) => {
              const existing = (prev[qNumAtStart] || '').trim();
              return {
                ...prev,
                [qNumAtStart]: existing ? `${existing} ${newTranscriptChunk.trim()}` : newTranscriptChunk.trim()
              };
            });
          }
        };

        recognition.onerror = () => {
          // Keep audio recorder running if available
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (_) {}
    }

    // 2. MediaRecorder for voice audio capture
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (evt) => {
          if (evt.data && evt.data.size > 0) {
            audioChunksRef.current.push(evt.data);
          }
        };

        mediaRecorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          if (audioChunksRef.current.length > 0) {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);
            setAudioUrls((prev) => ({ ...prev, [qNumAtStart]: url }));
            setResponses((prev) => {
              const existing = (prev[qNumAtStart] || '').trim();
              if (!existing) {
                return {
                  ...prev,
                  [qNumAtStart]: '[Voice Response Recorded]'
                };
              }
              return prev;
            });
          }
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
      } catch (micErr) {
        if (!SpeechRecognition) {
          stopAllRecording();
          setRecordingNotice('Microphone access is unavailable in this browser. Please type your response below.');
        }
      }
    } else if (!SpeechRecognition) {
      stopAllRecording();
      setRecordingNotice('Voice recording is not supported in this browser. Please type your response below.');
    }
  };

  // Persist current question response to backend
  const persistCurrentAnswer = async (nextStatus = undefined) => {
    if (!interview || !interview.id) return;
    stopAllRecording();
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
          responseMode: responseModes[qNum] || 'text'
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
  };

  const answeredCount = questions.filter((q, idx) => {
    const qNum = Number(q.questionNumber || idx + 1);
    return Boolean((responses[qNum] || '').trim());
  }).length;

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mock-interview-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopAllRecording();
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
            gap: '1rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
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
                3 Technical · 2 Behavioral (STAR)
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

          <button
            type="button"
            onClick={() => {
              stopAllRecording();
              onClose();
            }}
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

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#475569' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.4rem', color: '#0f172a' }}>
                Generating 5 Tailored Interview Questions...
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                Analyzing job description & requirements for 3 technical/role-specific and 2 STAR behavioral prompts.
              </p>
            </div>
          ) : showSummary ? (
            /* Completed Transcript Review View */
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
                    Review your technical and STAR behavioral responses below or practice again with a fresh set of questions.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {questions.map((q, idx) => {
                  const qNum = Number(q.questionNumber || idx + 1);
                  const isTech = q.category === 'technical';
                  const ans = (responses[qNum] || '').trim();
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
                        {ans || 'No response recorded for this question.'}
                      </div>
                      {audioUrls[qNum] && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <audio controls src={audioUrls[qNum]} style={{ height: '32px', width: '100%' }} />
                        </div>
                      )}
                    </div>
                  );
                })}
                {evaluation && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 0.75rem', color: '#0f172a' }}>AI Evaluation Scorecard</h3>
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
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
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
                        ? `Technical / Role-Specific (${currentQNum} of 3)`
                        : `Behavioral — STAR Method (${currentQNum - 3} of 2)`}
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

                {/* Response Controls: Type or Record */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginBottom: '0.5rem'
                  }}
                >
                  <label
                    htmlFor={`mock-interview-response-${currentQNum}`}
                    style={{ fontWeight: '600', fontSize: '0.88rem', color: '#1e293b' }}
                  >
                    Your Response (Type or Record Voice):
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleToggleRecording}
                      style={{
                        backgroundColor: isRecording ? '#dc2626' : '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <span>{isRecording ? '⏹ Stop Recording' : '🎙 Record Response'}</span>
                      {isRecording && <span>({formatTimer(recordingSeconds)})</span>}
                    </button>
                  </div>
                </div>

                {recordingNotice && (
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#b45309' }}>
                    {recordingNotice}
                  </p>
                )}

                <textarea
                  id={`mock-interview-response-${currentQNum}`}
                  rows={5}
                  value={currentAnswer}
                  onChange={handleTextChange}
                  placeholder={
                    isTechnical
                      ? 'Type your technical explanation here, or click "Record Response" to answer aloud...'
                      : 'Structure your response using Situation, Task, Action, and Result (STAR), or click "Record Response"...'
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

                {audioUrls[currentQNum] && (
                  <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>
                      Recorded Audio:
                    </span>
                    <audio controls src={audioUrls[currentQNum]} style={{ height: '32px', flex: 1 }} />
                  </div>
                )}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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
                View Transcript
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
                  disabled={saving}
                  style={{
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.55rem 1.2rem',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    cursor: saving ? 'wait' : 'pointer'
                  }}
                >
                  {saving ? 'Saving...' : 'Finish & Save Transcript ✓'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
