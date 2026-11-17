/**
 * Prompt Builder & Output Normalizer for Mock Interview Evaluation (Task 12.1)
 * Produces an LLM prompt that returns JSON-structured ratings (Clarity, Relevance,
 * Technical Depth) and critique points, and normalizes the result so the UI can trust it.
 */
const LOW_SCORE_THRESHOLD = 60; // questions scoring below this get a "Better Answer"
const VOICE_PLACEHOLDER = '[Voice Response Recorded]';
const CRITERIA = ['clarity', 'relevance', 'technicalDepth'];

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function average(nums) {
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
}

function toStringArray(arr) {
  return Array.isArray(arr) ? arr.map((i) => String(i).trim()).filter(Boolean) : [];
}

class MockInterviewEvaluationPromptBuilder {
  static LOW_SCORE_THRESHOLD = LOW_SCORE_THRESHOLD;
  static CRITERIA = CRITERIA;

  /** True when a transcript response contains real answer text */
  static hasAnswer(response) {
    const text = typeof response === 'string' ? response.trim() : '';
    return text.length > 0 && text !== VOICE_PLACEHOLDER;
  }

  static ratingLabel(score) {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Strong';
    if (score >= 50) return 'Developing';
    return 'Needs Work';
  }

  /**
   * @param {Object} params
   * @param {string} [params.title]
   * @param {string} [params.companyName]
   * @param {string} [params.jobDescription]
   * @param {string} [params.requirements]
   * @param {Array<Object>} params.transcript - interview.transcript entries
   */
  static buildEvaluationPrompt({
    title = 'Target Role',
    companyName = '',
    jobDescription = '',
    requirements = '',
    transcript = []
  } = {}) {
    const qa = transcript
      .map((e, i) => {
        const qNum = Number(e.questionNumber || i + 1);
        const answer = this.hasAnswer(e.response) ? e.response.trim() : '(no answer provided)';
        return `Question ${qNum} [${e.category || 'technical'}${e.focusArea ? ` - ${e.focusArea}` : ''}]: ${e.question}\nCandidate answer: ${answer}`;
      })
      .join('\n\n');

    return `You are an expert technical interviewer and career coach.
Evaluate the candidate's mock interview answers for the job below. Be fair, specific, and constructive.

Score EVERY question from 0 to 100 on three criteria:
- "clarity": organization, concision, and how easy the answer is to follow
- "relevance": how directly the answer addresses the question and the job's needs
- "technicalDepth": for technical questions, correctness, detail, and trade-offs; for behavioral (STAR) questions, concrete detail, completeness of Situation/Task/Action/Result, and measurable impact

Rules:
- An unanswered question must score 0 on every criterion.
- Do not reward length alone. Do not invent facts the candidate did not say.
- For every question whose average score is below ${LOW_SCORE_THRESHOLD}, write "betterAnswer": a model answer (3-6 sentences, first person) tailored to this job. Otherwise set "betterAnswer" to null.

Return strictly valid JSON with this exact shape:
{
  "summary": "2-3 sentence overall assessment",
  "strengths": ["3 to 5 specific strengths"],
  "communicationGaps": ["2 to 4 specific communication gaps"],
  "improvementTips": ["3 to 5 actionable tips"],
  "questionFeedback": [
    {
      "questionNumber": 1,
      "scores": { "clarity": 0, "relevance": 0, "technicalDepth": 0 },
      "critique": ["1 to 3 specific critique points"],
      "betterAnswer": null
    }
  ]
}

Job Posting:
- Title: ${title}
- Company: ${companyName || 'Hiring Company'}
- Description: ${jobDescription}
- Requirements: ${requirements}

Interview Transcript:
${qa}`;
  }

  static defaultBetterAnswer(entry = {}) {
    if (entry.category === 'behavioral' || entry.framework === 'STAR') {
      const g = entry.starGuide || {};
      return [
        `Situation: ${g.situation || 'Briefly set the scene with a specific project or team.'}`,
        `Task: ${g.task || 'State your responsibility or the problem to solve.'}`,
        `Action: ${g.action || 'Explain the concrete steps you personally took.'}`,
        `Result: ${g.result || 'Finish with a measurable outcome and what you learned.'}`
      ].join(' ');
    }
    return `Answer the question directly in your first sentence, then walk through your approach step by step, name the specific tools or concepts involved, explain the trade-offs you considered, and close with a concrete example. ${entry.hint || ''}`.trim();
  }

  /**
   * Validate and normalize raw LLM JSON. Overall and criteria scores are recomputed
   * here from per-question scores so they are always consistent (0-100).
   * @param {Object} payload
   * @param {Array<Object>} transcript
   */
  static normalizeEvaluationPayload(payload, transcript = []) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid JSON payload returned from LLM.');
    }

    const rawList = Array.isArray(payload.questionFeedback) ? payload.questionFeedback : [];
    const byNumber = new Map();
    rawList.forEach((item, i) => {
      if (item && typeof item === 'object') byNumber.set(Number(item.questionNumber || i + 1), item);
    });

    const questionFeedback = transcript.map((entry, idx) => {
      const qNum = Number(entry.questionNumber || idx + 1);
      const answered = this.hasAnswer(entry.response);
      const raw = byNumber.get(qNum);

      let scores = { clarity: 0, relevance: 0, technicalDepth: 0 };
      if (answered) {
        if (!raw || !raw.scores) throw new Error(`Missing evaluation for question ${qNum}.`);
        scores = {
          clarity: clampScore(raw.scores.clarity),
          relevance: clampScore(raw.scores.relevance),
          technicalDepth: clampScore(raw.scores.technicalDepth)
        };
      }

      const overall = average(CRITERIA.map((c) => scores[c]));
      const critique = toStringArray(raw && raw.critique).slice(0, 4);
      if (!answered && critique.length === 0) critique.push('No answer was provided for this question.');
      if (answered && critique.length === 0) critique.push('No specific critique returned for this answer.');

      const isLow = overall < LOW_SCORE_THRESHOLD;
      let betterAnswer = null;
      if (isLow) {
        betterAnswer =
          (raw && typeof raw.betterAnswer === 'string' && raw.betterAnswer.trim()) ||
          this.defaultBetterAnswer(entry);
      }

      return {
        questionNumber: qNum,
        category: entry.category || (qNum <= 3 ? 'technical' : 'behavioral'),
        focusArea: entry.focusArea || '',
        question: entry.question || '',
        answered,
        scores,
        overall,
        rating: this.ratingLabel(overall),
        critique,
        betterAnswer
      };
    });

    if (questionFeedback.length === 0) throw new Error('No interview questions to evaluate.');

    const criteria = {};
    CRITERIA.forEach((c) => {
      const score = average(questionFeedback.map((q) => q.scores[c]));
      criteria[c] = { score, rating: this.ratingLabel(score) };
    });
    const overallScore = average(questionFeedback.map((q) => q.overall));

    const strengths = toStringArray(payload.strengths).slice(0, 5);
    const communicationGaps = toStringArray(payload.communicationGaps).slice(0, 4);
    const improvementTips = toStringArray(payload.improvementTips).slice(0, 5);

    return {
      overallScore,
      rating: this.ratingLabel(overallScore),
      criteria,
      summary: typeof payload.summary === 'string' ? payload.summary.trim() : '',
      strengths: strengths.length ? strengths : ['You completed the mock interview and put your answers in writing.'],
      communicationGaps: communicationGaps.length ? communicationGaps : ['No major communication gaps were flagged.'],
      improvementTips: improvementTips.length ? improvementTips : ['Review the "Better Answer" suggestions and practice again.'],
      questionFeedback,
      lowScoreThreshold: LOW_SCORE_THRESHOLD
    };
  }
}

module.exports = MockInterviewEvaluationPromptBuilder;
