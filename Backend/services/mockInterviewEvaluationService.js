const crypto = require('crypto');
const Builder = require('./mockInterviewEvaluationPromptBuilder');

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const rateLimitStore = new Map();

const STOPWORDS = new Set(['that', 'this', 'with', 'from', 'have', 'what', 'would', 'about', 'your', 'about', 'their', 'there', 'when', 'where', 'which', 'tell', 'time', 'describe', 'situation', 'how', 'into', 'than', 'then', 'them', 'were', 'will', 'been', 'does', 'should', 'could']);
const TECH_TERMS = /\b(api|rest|graphql|database|sql|index(?:es|ing)?|cache|caching|redis|queue|async|await|promise|concurren\w*|latency|throughput|scal\w*|load balanc\w*|replica\w*|shard\w*|docker|kubernetes|ci\/cd|pipeline|middleware|jwt|oauth|authentication|state|memo\w*|render\w*|component|hook|test\w*|monitor\w*|logging|transaction|normaliz\w*|microservice\w*|architecture|algorithm|complexity|encryption|deploy\w*)\b/gi;
const TRADEOFF = /\b(trade-?offs?|because|however|instead|alternatively|compared|versus|downside|drawback|depends)\b/i;
const METRIC = /\d+(?:\.\d+)?\s?(?:%|ms|x\b|k\b|users|requests)/i;
const STAR = [
  /\b(when|during|while|at my|in my|project|team|situation|internship|course)\b/i,
  /\b(responsib\w*|goal|needed to|had to|tasked|task|asked to|objective)\b/i,
  /\b(i (?:built|led|created|decided|implemented|wrote|proposed|organized|designed|fixed|worked|set up|started|reached out|talked)|my approach|i took|i then)\b/i,
  /\b(result|outcome|as a result|improved|reduced|increased|saved|learned|delivered)\b|\d+\s?%|\d+x\b/i
];

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));
const tokenize = (text) =>
  (String(text || '').toLowerCase().match(/[a-z0-9+#.]+/g) || [])
    .map((t) => t.replace(/^\.+|\.+$/g, ''))
    .filter((t) => t.length > 3 && !STOPWORDS.has(t));

class MockInterviewEvaluationService {
  static hashTranscript(transcript = []) {
    const basis = transcript.map((e) => [e.questionNumber, e.response || '']);
    return crypto.createHash('sha256').update(JSON.stringify(basis)).digest('hex');
  }

  /** Throws a 4xx error if the interview cannot be evaluated yet */
  static validateInterview(interview) {
    if (!interview) {
      const err = new Error('Mock interview session not found.');
      err.statusCode = 404;
      throw err;
    }
    const transcript = Array.isArray(interview.transcript) ? interview.transcript : [];
    if (!transcript.some((e) => Builder.hasAnswer(e.response))) {
      const err = new Error('Answer at least one question before requesting an evaluation.');
      err.statusCode = 400;
      throw err;
    }
    return transcript;
  }

  static checkRateLimit(clientKey = 'anonymous', max = MAX_REQUESTS_PER_WINDOW, windowMs = RATE_LIMIT_WINDOW_MS) {
    const key = String(clientKey);
    const now = Date.now();
    const recent = (rateLimitStore.get(key) || []).filter((ts) => now - ts < windowMs);
    if (recent.length >= max) {
      const err = new Error('Rate limit exceeded. Please wait a minute before requesting another evaluation.');
      err.statusCode = 429;
      throw err;
    }
    recent.push(now);
    rateLimitStore.set(key, recent);
  }

  static resetRateLimits() {
    rateLimitStore.clear();
  }

  /**
   * Evaluate a completed session. Uses Gemini when GEMINI_API_KEY is set,
   * otherwise (or on failure) a deterministic heuristic scorer.
   * @returns {Promise<{ provider: string, evaluation: Object }>}
   */
  static async evaluate(interview, job = null) {
    const transcript = this.validateInterview(interview);
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && typeof fetch === 'function') {
      try {
        const prompt = Builder.buildEvaluationPrompt({
          title: interview.jobTitle || (job && job.title) || 'Target Role',
          companyName: interview.companyName || (job && job.companyName) || '',
          jobDescription: (job && job.description) || '',
          requirements: (job && job.requirements) || '',
          transcript
        });
        const raw = await this._callGeminiApi(prompt, apiKey);
        return { provider: 'gemini', evaluation: Builder.normalizeEvaluationPayload(raw, transcript) };
      } catch (err) {
        console.warn('Gemini evaluation failed, falling back to heuristic evaluator:', err.message);
      }
    }

    const raw = this._heuristicPayload(transcript);
    return { provider: 'heuristic-evaluator', evaluation: Builder.normalizeEvaluationPayload(raw, transcript) };
  }

  /** @private */
  static async _callGeminiApi(prompt, apiKey) {
    const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
      })
    });
    if (!response.ok) throw new Error(`Gemini API responded with status ${response.status}`);
    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini API.');
    return JSON.parse(text);
  }

  /** @private Score one answered question with transparent heuristics */
  static _scoreEntry(entry) {
    const text = entry.response.trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    const sentences = Math.max(1, text.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim()).length);
    const behavioral = entry.category === 'behavioral' || entry.framework === 'STAR';
    const critique = [];

    // Clarity: sensible length, several sentences, not run-on
    let clarity = words < 10 ? 20 : words < 30 ? 45 : words <= 250 ? 78 : 62;
    if (sentences >= 3) clarity += 10;
    if (words / sentences > 35) clarity -= 10;
    if (words < 30) critique.push('The answer is very short; expand it with reasoning and a concrete example.');
    else if (words > 250) critique.push('The answer is long; tighten it to the most important points.');

    // Relevance: overlap with the question's key terms
    const qTokens = new Set(tokenize(`${entry.question} ${entry.focusArea} ${entry.hint}`));
    const aTokens = new Set(tokenize(text));
    let hits = 0;
    qTokens.forEach((t) => { if (aTokens.has(t)) hits += 1; });
    let relevance = clamp(20 + (hits / Math.max(1, Math.min(qTokens.size, 12))) * 90, 0, 95);
    if (words < 10) relevance = Math.min(relevance, 40);
    if (relevance < 50) critique.push('Tie your answer more directly to what the question asks and to the role.');

    // Technical depth: technical vocabulary, trade-offs, metrics; STAR coverage for behavioral
    let depth;
    if (behavioral) {
      const groups = STAR.filter((re) => re.test(text)).length;
      depth = clamp(20 + groups * 20);
      if (groups < 4) critique.push('Cover all four STAR parts (Situation, Task, Action, Result), especially a measurable result.');
    } else {
      const terms = new Set((text.match(TECH_TERMS) || []).map((t) => t.toLowerCase()));
      depth = clamp(20 + Math.min(6, terms.size) * 9 + (METRIC.test(text) ? 8 : 0) + (TRADEOFF.test(text) ? 10 : 0));
      if (!TRADEOFF.test(text)) critique.push('Discuss trade-offs or why you chose one approach over another.');
      if (terms.size < 3) critique.push('Name the specific tools, patterns, or concepts you would use.');
    }

    if (critique.length === 0) critique.push('Clear, relevant answer with good supporting detail.');
    return { clarity: clamp(clarity), relevance, technicalDepth: depth, critique: critique.slice(0, 3) };
  }

  /** @private Build a raw payload shaped like the LLM output */
  static _heuristicPayload(transcript) {
    const feedback = [];
    const sums = { clarity: 0, relevance: 0, technicalDepth: 0 };

    transcript.forEach((entry, idx) => {
      const qNum = Number(entry.questionNumber || idx + 1);
      if (!Builder.hasAnswer(entry.response)) {
        feedback.push({ questionNumber: qNum, scores: { clarity: 0, relevance: 0, technicalDepth: 0 }, critique: ['No answer was provided for this question.'] });
        return;
      }
      const s = this._scoreEntry(entry);
      Object.keys(sums).forEach((k) => { sums[k] += s[k]; });
      feedback.push({
        questionNumber: qNum,
        scores: { clarity: s.clarity, relevance: s.relevance, technicalDepth: s.technicalDepth },
        critique: s.critique
      });
    });

    const n = Math.max(1, transcript.length);
    const avg = Object.fromEntries(Object.entries(sums).map(([k, v]) => [k, v / n]));
    const sorted = Object.entries(avg).sort((a, b) => b[1] - a[1]);
    const label = { clarity: 'clarity', relevance: 'relevance to the question', technicalDepth: 'technical depth' };
    const tips = {
      clarity: 'Lead with a one-sentence answer, then support it in 3-5 short sentences.',
      relevance: 'Reuse the key terms from the question and the job posting in your answer.',
      technicalDepth: 'Add specifics: tools, trade-offs, and measurable outcomes (e.g. "cut latency by 30%").'
    };

    const strengths = sorted.filter(([, v]) => v >= 60).map(([k, v]) => `Solid ${label[k]} across your answers (avg ${Math.round(v)}/100).`);
    const gaps = sorted.filter(([, v]) => v < 60).map(([k, v]) => `Your ${label[k]} needs work (avg ${Math.round(v)}/100).`);
    const unanswered = transcript.filter((e) => !Builder.hasAnswer(e.response)).length;
    if (unanswered) gaps.push(`${unanswered} question(s) were left unanswered.`);

    return {
      summary: 'Automated evaluation based on answer structure, relevance to each question, and technical or STAR detail.',
      strengths,
      communicationGaps: gaps,
      improvementTips: sorted.slice().reverse().slice(0, 3).map(([k]) => tips[k]),
      questionFeedback: feedback
    };
  }
}

module.exports = MockInterviewEvaluationService;
