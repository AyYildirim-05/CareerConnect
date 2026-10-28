const test = require('node:test');
const assert = require('node:assert');
const db = require('../config/db');
const MatchPromptBuilder = require('../services/matchPromptBuilder');
const LocalCompatibilityAnalyzer = require('../services/localCompatibilityAnalyzer');
const CompatibilityService = require('../services/compatibilityService');
const JobMatchController = require('../controllers/jobMatchController');

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

test('MatchPromptBuilder.buildCompatibilityPrompt includes candidate skills and job requirements', () => {
  const prompt = MatchPromptBuilder.buildCompatibilityPrompt({
    candidateText: 'Experienced with React, Node.js, and PostgreSQL.',
    candidateSkills: ['React', 'Node.js', 'PostgreSQL'],
    job: {
      title: 'Senior Full Stack Developer',
      companyName: 'CloudScale Technologies',
      department: 'Engineering',
      description: 'Build full-stack cloud portals.',
      requirements: 'React, Node.js, PostgreSQL, Docker, Kubernetes'
    }
  });

  assert.ok(prompt.includes('Senior Full Stack Developer'));
  assert.ok(prompt.includes('CloudScale Technologies'));
  assert.ok(prompt.includes('React, Node.js, PostgreSQL'));
  assert.ok(prompt.includes('Docker, Kubernetes'));
});

test('MatchPromptBuilder.normalizeMatchPayload clamps score to 0-100 and enforces 2-3 summary bullets', () => {
  const normalized = MatchPromptBuilder.normalizeMatchPayload({
    matchScore: 112.4,
    matchedSkills: ['React', 'Node.js'],
    missingSkills: ['Docker'],
    summaryBullets: [
      'Matched core frontend and backend JS skills.',
      'Missing containerization experience with Docker.',
      'Good overall fit for the team.',
      'Extra fourth bullet that should be trimmed.'
    ]
  });

  assert.strictEqual(normalized.matchScore, 100);
  assert.strictEqual(normalized.summaryBullets.length, 3);
  assert.deepStrictEqual(normalized.matchedSkills, ['React', 'Node.js']);
  assert.deepStrictEqual(normalized.missingSkills, ['Docker']);
});

test('LocalCompatibilityAnalyzer.analyze computes 0-100% score and 2-3 bullet summary', () => {
  const sampleJob = {
    id: 'job_test_1',
    title: 'Full Stack Developer',
    companyName: 'CloudScale Technologies',
    description: 'Develop modern web services.',
    requirements: 'JavaScript, React, Node.js, PostgreSQL, Docker'
  };

  const result = LocalCompatibilityAnalyzer.analyze({
    candidateSkills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'],
    candidateText: 'Full stack developer skilled in JavaScript, React, Node.js, and PostgreSQL.',
    job: sampleJob
  });

  assert.strictEqual(result.matchScore, 80);
  assert.ok(result.matchedSkills.includes('React'));
  assert.ok(result.matchedSkills.includes('Node.js'));
  assert.ok(result.missingSkills.includes('Docker'));
  assert.ok(result.summaryBullets.length >= 2 && result.summaryBullets.length <= 3);
});

test('CompatibilityService.analyzeCompatibility returns structured match score and gap analysis', async () => {
  CompatibilityService.clearCache();

  const sampleJob = {
    id: 'job_test_2',
    title: 'Backend Engineer',
    companyName: 'FinMetrics Global',
    description: 'Build financial APIs.',
    requirements: 'Node.js, Express, PostgreSQL, Docker'
  };

  const match = await CompatibilityService.analyzeCompatibility({
    candidateSkills: ['Node.js', 'Express'],
    resumeText: 'Backend developer with Node.js and Express experience.',
    job: sampleJob,
    useLlm: false
  });

  assert.strictEqual(match.jobId, 'job_test_2');
  assert.strictEqual(match.matchScore, 50);
  assert.deepStrictEqual(match.matchedSkills, ['Node.js', 'Express']);
  assert.deepStrictEqual(match.missingSkills, ['PostgreSQL', 'Docker']);
  assert.ok(match.summaryBullets.length >= 2 && match.summaryBullets.length <= 3);
});

test('JobMatchController.getMatchAnalysis handles GET/POST /api/jobs/:id/match', async () => {
  process.env.DB_PROVIDER = 'mock';
  await db.initDb();
  CompatibilityService.clearCache();

  const req = {
    params: { id: 'job_post_1' },
    query: { mode: 'local' },
    user: { id: 'user_seeker_1', role: 'Job Seeker' },
    body: {}
  };
  const res = createMockRes();

  await JobMatchController.getMatchAnalysis(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.data.success, true);
  assert.ok(typeof res.data.match.matchScore === 'number');
  assert.ok(res.data.match.matchScore >= 0 && res.data.match.matchScore <= 100);
  assert.ok(Array.isArray(res.data.match.summaryBullets));
  assert.ok(res.data.match.summaryBullets.length >= 2 && res.data.match.summaryBullets.length <= 3);
});
