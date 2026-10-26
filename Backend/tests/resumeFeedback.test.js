const test = require('node:test');
const assert = require('node:assert');
const ResumeParserService = require('../services/resumeParserService');
const ResumeFeedbackService = require('../services/resumeFeedbackService');
const { analyzeResumeFeedback } = require('../controllers/resumeController');

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

test('ResumeParserService.profileToText converts structured resume JSON into readable text', () => {
  const sampleProfile = {
    personalInfo: {
      fullName: 'Alex Mercer',
      summary: 'Full-stack software engineer with experience in cloud web apps.'
    },
    skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'],
    workExperience: [
      {
        jobTitle: 'Software Developer Intern',
        company: 'TechCorp',
        dates: '2024 - 2025',
        description: 'Built REST APIs and improved query performance by 30%.'
      }
    ],
    education: [
      {
        degree: 'B.Eng. in Software Engineering',
        institution: 'Concordia University',
        dates: '2022 - 2026'
      }
    ]
  };

  const text = ResumeParserService.profileToText(sampleProfile);
  assert.ok(text.includes('Alex Mercer'));
  assert.ok(text.includes('React, Node.js, PostgreSQL'));
  assert.ok(text.includes('Reduced') || text.includes('30%'));
  assert.ok(text.includes('Concordia University'));
});

test('ResumeFeedbackService.validateInput rejects missing targetRole or short resumeText', () => {
  assert.throws(
    () => ResumeFeedbackService.validateInput('Valid resume text with plenty of details here.', ''),
    (err) => err.statusCode === 400 && /target role/i.test(err.message)
  );

  assert.throws(
    () => ResumeFeedbackService.validateInput('Too short', 'Backend Engineer'),
    (err) => err.statusCode === 400 && /too short/i.test(err.message)
  );
});

test('ResumeFeedbackService.checkRateLimit enforces per-user sliding window limits', () => {
  ResumeFeedbackService.resetRateLimits();
  const userKey = 'test-user-rate-limit';

  for (let i = 0; i < 5; i++) {
    ResumeFeedbackService.checkRateLimit(userKey, 5, 60000);
  }

  assert.throws(
    () => ResumeFeedbackService.checkRateLimit(userKey, 5, 60000),
    (err) => err.statusCode === 429 && /rate limit exceeded/i.test(err.message)
  );

  ResumeFeedbackService.resetRateLimits();
});

test('ResumeFeedbackService.analyzeResume returns structured Strengths, Missing Keywords, and Actionable Revisions', async () => {
  ResumeFeedbackService.resetRateLimits();

  const sampleResumeText = `
    Jane Doe - github.com/janedoe
    Skills: JavaScript, React, HTML5, CSS3
    Experience: Frontend Developer Intern at Acme Web (2024 - 2025)
    - Developed responsive dashboard components and reduced bundle size by 25%.
  `;

  const result = await ResumeFeedbackService.analyzeResume({
    resumeText: sampleResumeText,
    targetRole: 'Frontend Developer',
    clientKey: 'user-frontend-1'
  });

  assert.strictEqual(result.targetRole, 'Frontend Developer');
  assert.ok(Array.isArray(result.strengths) && result.strengths.length > 0);
  assert.ok(Array.isArray(result.missingKeywords) && result.missingKeywords.length > 0);
  assert.ok(Array.isArray(result.actionableRevisions) && result.actionableRevisions.length > 0);
  assert.ok(result.missingKeywords.includes('TypeScript') || result.missingKeywords.includes('Next.js'));
});

test('analyzeResumeFeedback controller returns 200 with structured feedback or 400 on invalid input', async () => {
  ResumeFeedbackService.resetRateLimits();

  // 1. Valid request with resumeProfile in body
  const reqValid = {
    body: {
      targetRole: 'Backend Engineer',
      resumeProfile: {
        personalInfo: { fullName: 'Sam Carter', summary: 'Backend developer focused on Node.js APIs' },
        skills: ['Node.js', 'Express', 'SQL'],
        workExperience: [
          {
            jobTitle: 'Backend Intern',
            company: 'CloudSys',
            dates: '2024 - 2025',
            description: 'Created REST API endpoints serving 2,000+ users.'
          }
        ]
      }
    },
    user: { id: 'user-123' }
  };
  const resValid = createMockRes();
  await analyzeResumeFeedback(reqValid, resValid);

  assert.strictEqual(resValid.statusCode, 200);
  assert.strictEqual(resValid.data.success, true);
  assert.ok(Array.isArray(resValid.data.feedback.strengths));
  assert.ok(Array.isArray(resValid.data.feedback.missingKeywords));
  assert.ok(Array.isArray(resValid.data.feedback.actionableRevisions));

  // 2. Invalid request missing targetRole
  const reqInvalid = {
    body: { resumeText: 'Some valid length resume text for testing validation.' },
    user: { id: 'user-123' }
  };
  const resInvalid = createMockRes();
  await analyzeResumeFeedback(reqInvalid, resInvalid);

  assert.strictEqual(resInvalid.statusCode, 400);
  assert.strictEqual(resInvalid.data.success, false);
});
