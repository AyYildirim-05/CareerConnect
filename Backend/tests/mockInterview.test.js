const test = require('node:test');
const assert = require('node:assert');
const db = require('../config/db');
const MockInterviewPromptBuilder = require('../services/mockInterviewPromptBuilder');
const MockInterviewService = require('../services/mockInterviewService');
const MockInterviewModel = require('../models/mockInterviewModel');
const MockInterviewController = require('../controllers/mockInterviewController');

function createMockRes() {
  return {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    }
  };
}

const SAMPLE_LLM_QUESTIONS = [
  {
    id: 'q_1',
    questionNumber: 1,
    category: 'technical',
    framework: 'Role-Specific',
    focusArea: 'Node.js & Express APIs',
    question: 'How would you design a scalable REST API using Node.js and Express for high-concurrency traffic?',
    hint: 'Discuss middleware, async error handling, and connection pooling.'
  },
  {
    id: 'q_2',
    questionNumber: 2,
    category: 'technical',
    framework: 'Role-Specific',
    focusArea: 'React State Management',
    question: 'How do you prevent unnecessary re-renders in complex React dashboard components?',
    hint: 'Cover memoization, state colocation, and profiling tools.'
  },
  {
    id: 'q_3',
    questionNumber: 3,
    category: 'technical',
    framework: 'Role-Specific',
    focusArea: 'Cloud & PostgreSQL',
    question: 'What indexing and query optimization strategies would you apply to PostgreSQL in a distributed cloud environment?',
    hint: 'Mention EXPLAIN ANALYZE, composite indexes, and read replicas.'
  },
  {
    id: 'q_4',
    questionNumber: 4,
    category: 'behavioral',
    framework: 'STAR',
    focusArea: 'Problem Solving Under Pressure',
    question: 'Tell me about a time when you had to resolve a critical production bug under a tight deadline.',
    hint: 'Use the STAR method (Situation, Task, Action, Result).'
  },
  {
    id: 'q_5',
    questionNumber: 5,
    category: 'behavioral',
    framework: 'STAR',
    focusArea: 'Cross-Functional Collaboration',
    question: 'Describe a situation where you disagreed with a teammate on a technical architecture decision and how you reached consensus.',
    hint: 'Use the STAR method (Situation, Task, Action, Result).'
  }
];

test('Task 11.1: MockInterviewPromptBuilder.buildInterviewPrompt includes job_description and requirements', () => {
  const prompt = MockInterviewPromptBuilder.buildInterviewPrompt({
    title: 'Senior Full Stack Developer',
    companyName: 'CloudScale Technologies',
    job_description: 'Build distributed APIs and React dashboards.',
    requirements: '3+ years with Node.js, Express, React, and PostgreSQL.'
  });

  assert.ok(prompt.includes('Senior Full Stack Developer'));
  assert.ok(prompt.includes('Build distributed APIs and React dashboards.'));
  assert.ok(prompt.includes('3+ years with Node.js, Express, React, and PostgreSQL.'));
  assert.ok(prompt.includes('STAR'));
});

test('Task 11.1: MockInterviewPromptBuilder.normalizeQuestionsPayload enforces 3 technical and 2 behavioral STAR questions', () => {
  const normalized = MockInterviewPromptBuilder.normalizeQuestionsPayload({
    questions: SAMPLE_LLM_QUESTIONS
  });

  assert.strictEqual(normalized.questions.length, 5);
  const technical = normalized.questions.filter((q) => q.category === 'technical');
  const behavioral = normalized.questions.filter((q) => q.category === 'behavioral');
  assert.strictEqual(technical.length, 3);
  assert.strictEqual(behavioral.length, 2);
  assert.ok(behavioral.every((q) => q.framework === 'STAR' && q.starGuide));
});

test('Task 11.2: MockInterviewModel defines mock_interviews schema (user_id, job_id, transcript, created_at) and persists sessions', async () => {
  process.env.DB_PROVIDER = 'mock';
  await db.initDb();

  const sql = MockInterviewModel.getPostgresTableSQL();
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS mock_interviews'));
  assert.ok(sql.includes('user_id'));
  assert.ok(sql.includes('job_id'));
  assert.ok(sql.includes('transcript'));
  assert.ok(sql.includes('created_at'));

  const created = await MockInterviewModel.create({
    user_id: 'user_seeker_1',
    job_id: 'job_post_1',
    jobTitle: 'Senior Full Stack Developer',
    companyName: 'CloudScale Technologies',
    questions: SAMPLE_LLM_QUESTIONS
  });

  assert.ok(created.id);
  assert.strictEqual(created.user_id, 'user_seeker_1');
  assert.strictEqual(created.job_id, 'job_post_1');
  assert.ok(Array.isArray(created.transcript));
  assert.strictEqual(created.transcript.length, 5);
  assert.ok(created.created_at);

  const updated = await MockInterviewModel.updateTranscript(created.id, 'user_seeker_1', {
    singleAnswer: {
      questionNumber: 1,
      response: 'I would use stateless horizontal scaling with connection pooling.',
      responseMode: 'text'
    }
  });

  assert.strictEqual(
    updated.transcript[0].response,
    'I would use stateless horizontal scaling with connection pooling.'
  );
  assert.ok(updated.transcript[0].answeredAt);
});

test('Task 11.1 & 11.3: MockInterviewController starts interview and saves sequential responses', async () => {
  process.env.DB_PROVIDER = 'mock';
  await db.initDb();

  // Stub MockInterviewService._callGeminiApi to verify end-to-end controller flow deterministically
  const origApiKey = process.env.GEMINI_API_KEY;
  const origCallGemini = MockInterviewService._callGeminiApi;
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  MockInterviewService._callGeminiApi = async () =>
    MockInterviewPromptBuilder.normalizeQuestionsPayload({ questions: SAMPLE_LLM_QUESTIONS });

  try {
    const startReq = {
      params: { jobId: 'job_post_1' },
      user: { id: 'user_seeker_1', role: 'Job Seeker' },
      body: { forceNew: true }
    };
    const startRes = createMockRes();

    await MockInterviewController.startInterview(startReq, startRes);

    assert.strictEqual(startRes.statusCode, 201);
    assert.strictEqual(startRes.data.success, true);
    assert.strictEqual(startRes.data.interview.questions.length, 5);

    const interviewId = startRes.data.interview.id;
    const saveReq = {
      params: { interviewId },
      user: { id: 'user_seeker_1', role: 'Job Seeker' },
      body: {
        singleAnswer: {
          questionNumber: 4,
          response: 'Situation: Production outage. Task: Restore API. Action: Rolled back bad migration. Result: Zero data loss.',
          responseMode: 'text'
        }
      }
    };
    const saveRes = createMockRes();

    await MockInterviewController.saveTranscript(saveReq, saveRes);

    assert.strictEqual(saveRes.statusCode, 200);
    assert.strictEqual(saveRes.data.success, true);
    assert.strictEqual(saveRes.data.interview.transcript[3].responseMode, 'text');
    assert.ok(saveRes.data.interview.transcript[3].response.includes('Situation: Production outage'));

    // Add a custom question
    const addCustomReq = {
      params: { interviewId },
      user: { id: 'user_seeker_1', role: 'Job Seeker' },
      body: {
        category: 'technical',
        focusArea: 'Distributed Caching',
        question: 'How would you handle cache stampedes in a Redis-backed microservice?',
        hint: 'Discuss mutex locks, jittered TTLs, and stale-while-revalidate.'
      }
    };
    const addCustomRes = createMockRes();
    await MockInterviewController.addQuestion(addCustomReq, addCustomRes);

    assert.strictEqual(addCustomRes.statusCode, 201);
    assert.strictEqual(addCustomRes.data.success, true);
    assert.strictEqual(addCustomRes.data.interview.questions.length, 6);
    assert.strictEqual(addCustomRes.data.interview.transcript.length, 6);
    assert.strictEqual(addCustomRes.data.question.questionNumber, 6);

    // Generate an additional behavioral STAR question (Q7)
    const addGenReq = {
      params: { interviewId },
      user: { id: 'user_seeker_1', role: 'Job Seeker' },
      body: {
        generate: true,
        category: 'behavioral'
      }
    };
    const addGenRes = createMockRes();
    await MockInterviewController.addQuestion(addGenReq, addGenRes);

    assert.strictEqual(addGenRes.statusCode, 201);
    assert.strictEqual(addGenRes.data.interview.questions.length, 7);
    assert.strictEqual(addGenRes.data.question.category, 'behavioral');
    assert.strictEqual(addGenRes.data.question.framework, 'STAR');
    assert.ok(addGenRes.data.question.starGuide);
  } finally {
    MockInterviewService._callGeminiApi = origCallGemini;
    if (origApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = origApiKey;
    }
  }
});
