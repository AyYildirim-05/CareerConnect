const test = require('node:test');
const assert = require('node:assert');
const db = require('../config/db');
const Builder = require('../services/mockInterviewEvaluationPromptBuilder');
const Service = require('../services/mockInterviewEvaluationService');
const MockInterviewModel = require('../models/mockInterviewModel');
const Controller = require('../controllers/mockInterviewEvaluationController');

function createMockRes() {
  return { statusCode: 200, data: null, status(c) { this.statusCode = c; return this; }, json(p) { this.data = p; return this; } };
}

const QUESTIONS = [1, 2, 3].map((n) => ({ id: `q_${n}`, questionNumber: n, category: 'technical', framework: 'Role-Specific', focusArea: 'Node.js', question: `Technical question ${n} about Node.js APIs?`, hint: 'middleware, caching' }))
  .concat([4, 5].map((n) => ({ id: `q_${n}`, questionNumber: n, category: 'behavioral', framework: 'STAR', focusArea: 'Teamwork', question: `Tell me about a time ${n}`, hint: 'STAR', starGuide: { situation: 's', task: 't', action: 'a', result: 'r' } })));

const GOOD = 'I would use Express middleware with a Redis cache to cut latency by 30% because it scales better compared to per-request queries, plus connection pooling, tests and monitoring.';

function transcriptWith(responses) {
  return MockInterviewModel.buildTranscriptEntries(QUESTIONS, responses.map((r, i) => ({ questionNumber: i + 1, response: r })));
}

test('Task 12.1: prompt includes transcript, rubric and the three criteria', () => {
  const prompt = Builder.buildEvaluationPrompt({ title: 'Backend Dev', transcript: transcriptWith([GOOD, '', '', '', '']) });
  assert.ok(prompt.includes('Backend Dev'));
  assert.ok(prompt.includes('clarity') && prompt.includes('relevance') && prompt.includes('technicalDepth'));
  assert.ok(prompt.includes('(no answer provided)'));
});

test('Task 12.1: normalizer clamps scores, recomputes overall, adds Better Answer only for low scores', () => {
  const transcript = transcriptWith([GOOD, 'ok', '', '', '']);
  const out = Builder.normalizeEvaluationPayload({
    overallScore: 999,
    questionFeedback: [
      { questionNumber: 1, scores: { clarity: 150, relevance: 90, technicalDepth: 80 }, critique: ['Great'], betterAnswer: 'ignored' },
      { questionNumber: 2, scores: { clarity: 20, relevance: 10, technicalDepth: 5 }, critique: ['Too short'], betterAnswer: 'Model answer' }
    ]
  }, transcript);

  assert.strictEqual(out.questionFeedback[0].scores.clarity, 100);
  assert.strictEqual(out.questionFeedback[0].betterAnswer, null);
  assert.strictEqual(out.questionFeedback[1].betterAnswer, 'Model answer');
  assert.strictEqual(out.questionFeedback[2].overall, 0);
  assert.ok(out.questionFeedback[2].betterAnswer);
  assert.ok(out.overallScore >= 0 && out.overallScore <= 100);
  ['clarity', 'relevance', 'technicalDepth'].forEach((c) => assert.ok(out.criteria[c].score >= 0 && out.criteria[c].score <= 100));
});

test('Task 12.1: normalizer rejects an answered question the LLM did not score', () => {
  assert.throws(() => Builder.normalizeEvaluationPayload({ questionFeedback: [] }, transcriptWith([GOOD, '', '', '', ''])), /Missing evaluation/);
});

test('Heuristic evaluator scores a strong answer above a weak one', async () => {
  delete process.env.GEMINI_API_KEY;
  const { provider, evaluation } = await Service.evaluate({ transcript: transcriptWith([GOOD, 'Use memo.', '', '', '']) });
  assert.strictEqual(provider, 'heuristic-evaluator');
  assert.ok(evaluation.questionFeedback[0].overall > evaluation.questionFeedback[1].overall);
  assert.ok(evaluation.questionFeedback[1].betterAnswer);
});

test('Task 12.2: evaluate endpoint persists, caches, enforces ownership and validates input', async () => {
  process.env.DB_PROVIDER = 'mock';
  delete process.env.GEMINI_API_KEY;
  await db.initDb();
  Service.resetRateLimits();

  const created = await MockInterviewModel.create({ user_id: 'user_seeker_1', job_id: 'job_post_1', jobTitle: 'Senior Full Stack Developer', questions: QUESTIONS });

  // No answers yet -> 400
  let res = createMockRes();
  await Controller.evaluate({ params: { interviewId: created.id }, user: { id: 'user_seeker_1' }, query: {}, body: {} }, res);
  assert.strictEqual(res.statusCode, 400);

  await MockInterviewModel.updateTranscript(created.id, 'user_seeker_1', { transcript: transcriptWith([GOOD, 'Use memo.', '', '', '']) });

  // Another user -> 403
  res = createMockRes();
  await Controller.evaluate({ params: { interviewId: created.id }, user: { id: 'intruder' }, query: {}, body: {} }, res);
  assert.strictEqual(res.statusCode, 403);

  // Owner -> 200 and stored
  const req = { params: { interviewId: created.id }, user: { id: 'user_seeker_1' }, query: {}, body: {} };
  res = createMockRes();
  await Controller.evaluate(req, res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.data.cached, false);
  assert.ok(typeof res.data.evaluation.overallScore === 'number');
  assert.strictEqual((await MockInterviewModel.findById(created.id)).evaluation.overallScore, res.data.evaluation.overallScore);

  // Same transcript -> cached
  res = createMockRes();
  await Controller.evaluate(req, res);
  assert.strictEqual(res.data.cached, true);

  // Save to dashboard and list
  res = createMockRes();
  await Controller.setSaved({ params: { interviewId: created.id }, user: { id: 'user_seeker_1' }, body: { saved: true } }, res);
  assert.strictEqual(res.data.saved, true);
  res = createMockRes();
  await Controller.listSaved({ user: { id: 'user_seeker_1' } }, res);
  assert.ok(res.data.interviews.some((i) => i.id === created.id));
});
