const test = require('node:test');
const assert = require('node:assert');
const { JobPostingModel, RecruiterModel, CompanyModel } = require('../models');
const JobController = require('../controllers/jobController');

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

const recruiter = { id: 'rec_1', jobPostings: [] };
const company = { id: 'cmp_1', name: 'Shopify' };

const validJob = {
  title: 'Backend Developer',
  description: 'Build and maintain REST APIs.',
  department: 'Engineering',
  location: 'Montreal, QC',
  jobType: 'Full-time',
  workMode: 'Hybrid',
  requirements: 'Node.js, SQL'
};

const ownedJob = {
  id: 'job_1',
  recruiterId: 'rec_1',
  companyId: 'cmp_1',
  status: JobPostingModel.STATUS_DRAFT,
  ...validJob
};

// Stubs the models for a recruiter that has a company; returns captured calls
function stubHappyPath(t) {
  const calls = {};
  t.mock.method(CompanyModel, 'findForUser', async () => company);
  t.mock.method(RecruiterModel, 'findById', async () => recruiter);
  t.mock.method(RecruiterModel, 'addJobPosting', async (rid, jid) => { calls.added = [rid, jid]; });
  t.mock.method(JobPostingModel, 'create', async (params) => {
    calls.created = params;
    return {
      id: 'job_new',
      ...params.fields,
      status: params.publish ? JobPostingModel.STATUS_PUBLISHED : JobPostingModel.STATUS_DRAFT
    };
  });
  t.mock.method(JobPostingModel, 'findById', async (id) => (id === ownedJob.id ? ownedJob : null));
  t.mock.method(JobPostingModel, 'update', async (id, updates) => {
    calls.updated = [id, updates];
    return { ...ownedJob, ...updates };
  });
  t.mock.method(JobPostingModel, 'publish', async (id) => {
    calls.published = id;
    return { ...ownedJob, status: JobPostingModel.STATUS_PUBLISHED };
  });
  t.mock.method(JobPostingModel, 'delete', async (id) => { calls.deleted = id; });
  t.mock.method(RecruiterModel, 'removeJobPosting', async (rid, jid) => { calls.removed = [rid, jid]; });
  return calls;
}

// ---------- Job posting (create) ----------

test('JobController.create saves a valid posting as a draft by default', async (t) => {
  const calls = stubHappyPath(t);
  const res = createMockRes();

  await JobController.create({ user: { id: 'rec_1' }, body: { ...validJob } }, res);

  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(res.data.message, 'Job posting saved as draft.');
  assert.strictEqual(res.data.job.status, JobPostingModel.STATUS_DRAFT);
  assert.strictEqual(calls.created.publish, false);
  assert.strictEqual(calls.created.company, company);
  assert.deepStrictEqual(calls.added, ['rec_1', 'job_new']);
});

test('JobController.create publishes immediately when publish is true', async (t) => {
  const calls = stubHappyPath(t);
  const res = createMockRes();

  await JobController.create({ user: { id: 'rec_1' }, body: { ...validJob, publish: true } }, res);

  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(res.data.message, 'Job posting published!');
  assert.strictEqual(calls.created.publish, true);
});

test('JobController.create trims fields before saving', async (t) => {
  const calls = stubHappyPath(t);
  const res = createMockRes();

  await JobController.create({ user: { id: 'rec_1' }, body: { ...validJob, title: '  Backend Developer  ' } }, res);

  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(calls.created.fields.title, 'Backend Developer');
});

test('JobController.create rejects missing required fields', async (t) => {
  const calls = stubHappyPath(t);
  const res = createMockRes();

  await JobController.create({ user: { id: 'rec_1' }, body: { title: '   ' } }, res);

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.data.message, 'Validation failed');
  for (const field of ['title', 'description', 'department', 'location', 'jobType', 'workMode', 'requirements']) {
    assert.ok(res.data.errors[field], `expected error for ${field}`);
  }
  assert.strictEqual(calls.created, undefined);
});

test('JobController.create rejects invalid jobType and workMode', async (t) => {
  stubHappyPath(t);
  const res = createMockRes();

  await JobController.create({ user: { id: 'rec_1' }, body: { ...validJob, jobType: 'Gig', workMode: 'Moon' } }, res);

  assert.strictEqual(res.statusCode, 400);
  assert.match(res.data.errors.jobType, /must be one of/);
  assert.match(res.data.errors.workMode, /must be one of/);
});

test('JobController.create requires the recruiter to have a company', async (t) => {
  const calls = stubHappyPath(t);
  CompanyModel.findForUser.mock.mockImplementation(async () => null);
  const res = createMockRes();

  await JobController.create({ user: { id: 'rec_1' }, body: { ...validJob } }, res);

  assert.strictEqual(res.statusCode, 400);
  assert.match(res.data.error, /company page/i);
  assert.strictEqual(calls.created, undefined);
});

test('JobController.create returns 404 when recruiter does not exist', async (t) => {
  stubHappyPath(t);
  RecruiterModel.findById.mock.mockImplementation(async () => null);
  const res = createMockRes();

  await JobController.create({ user: { id: 'ghost' }, body: { ...validJob } }, res);

  assert.strictEqual(res.statusCode, 404);
});

test('JobController.create returns 500 on database error', async (t) => {
  stubHappyPath(t);
  t.mock.method(console, 'error', () => {});
  JobPostingModel.create.mock.mockImplementation(async () => { throw new Error('db down'); });
  const res = createMockRes();

  await JobController.create({ user: { id: 'rec_1' }, body: { ...validJob } }, res);

  assert.strictEqual(res.statusCode, 500);
});

// ---------- Job editing (update) ----------

test('JobController.update edits an owned posting and re-links it to the company', async (t) => {
  const calls = stubHappyPath(t);
  const res = createMockRes();

  await JobController.update(
    { user: { id: 'rec_1' }, params: { id: 'job_1' }, body: { ...validJob, title: 'Senior Backend Developer' } },
    res
  );

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.data.message, 'Job posting updated.');
  assert.strictEqual(res.data.job.title, 'Senior Backend Developer');
  assert.strictEqual(calls.updated[0], 'job_1');
  assert.strictEqual(calls.updated[1].companyId, 'cmp_1');
  assert.strictEqual(calls.updated[1].companyName, 'Shopify');
});

test('JobController.update returns 404 for a missing posting', async (t) => {
  const calls = stubHappyPath(t);
  const res = createMockRes();

  await JobController.update({ user: { id: 'rec_1' }, params: { id: 'nope' }, body: { ...validJob } }, res);

  assert.strictEqual(res.statusCode, 404);
  assert.strictEqual(calls.updated, undefined);
});

test('JobController.update forbids editing another recruiter\'s posting', async (t) => {
  const calls = stubHappyPath(t);
  const res = createMockRes();

  await JobController.update({ user: { id: 'rec_other' }, params: { id: 'job_1' }, body: { ...validJob } }, res);

  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(calls.updated, undefined);
});

test('JobController.update rejects invalid fields', async (t) => {
  const calls = stubHappyPath(t);
  const res = createMockRes();

  await JobController.update(
    { user: { id: 'rec_1' }, params: { id: 'job_1' }, body: { ...validJob, description: '', jobType: 'Gig' } },
    res
  );

  assert.strictEqual(res.statusCode, 400);
  assert.ok(res.data.errors.description);
  assert.ok(res.data.errors.jobType);
  assert.strictEqual(calls.updated, undefined);
});

test('JobController.update requires the recruiter to have a company', async (t) => {
  const calls = stubHappyPath(t);
  CompanyModel.findForUser.mock.mockImplementation(async () => null);
  const res = createMockRes();

  await JobController.update({ user: { id: 'rec_1' }, params: { id: 'job_1' }, body: { ...validJob } }, res);

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(calls.updated, undefined);
});

test('JobController.update returns 500 on database error', async (t) => {
  stubHappyPath(t);
  t.mock.method(console, 'error', () => {});
  JobPostingModel.update.mock.mockImplementation(async () => { throw new Error('db down'); });
  const res = createMockRes();

  await JobController.update({ user: { id: 'rec_1' }, params: { id: 'job_1' }, body: { ...validJob } }, res);

  assert.strictEqual(res.statusCode, 500);
});

// ---------- Job posting (publish) ----------

test('JobController.publish publishes an owned draft', async (t) => {
  const calls = stubHappyPath(t);
  const res = createMockRes();

  await JobController.publish({ user: { id: 'rec_1' }, params: { id: 'job_1' } }, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.data.message, 'Job posting published!');
  assert.strictEqual(res.data.job.status, JobPostingModel.STATUS_PUBLISHED);
  assert.strictEqual(calls.published, 'job_1');
});

test('JobController.publish does nothing for an already published posting', async (t) => {
  const calls = stubHappyPath(t);
  JobPostingModel.findById.mock.mockImplementation(async () => ({ ...ownedJob, status: JobPostingModel.STATUS_PUBLISHED }));
  const res = createMockRes();

  await JobController.publish({ user: { id: 'rec_1' }, params: { id: 'job_1' } }, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.data.message, 'Job posting is already published.');
  assert.strictEqual(calls.published, undefined);
});

test('JobController.publish requires the posting to be linked to a company', async (t) => {
  const calls = stubHappyPath(t);
  JobPostingModel.findById.mock.mockImplementation(async () => ({ ...ownedJob, companyId: null }));
  const res = createMockRes();

  await JobController.publish({ user: { id: 'rec_1' }, params: { id: 'job_1' } }, res);

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(calls.published, undefined);
});

test('JobController.publish returns 404 for a missing posting', async (t) => {
  const calls = stubHappyPath(t);
  const res = createMockRes();

  await JobController.publish({ user: { id: 'rec_1' }, params: { id: 'nope' } }, res);

  assert.strictEqual(res.statusCode, 404);
  assert.strictEqual(calls.published, undefined);
});

test('JobController.publish forbids publishing another recruiter\'s posting', async (t) => {
  const calls = stubHappyPath(t);
  const res = createMockRes();

  await JobController.publish({ user: { id: 'rec_other' }, params: { id: 'job_1' } }, res);

  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(calls.published, undefined);
});

test('JobController.publish returns 500 on database error', async (t) => {
  stubHappyPath(t);
  t.mock.method(console, 'error', () => {});
  JobPostingModel.publish.mock.mockImplementation(async () => { throw new Error('db down'); });
  const res = createMockRes();

  await JobController.publish({ user: { id: 'rec_1' }, params: { id: 'job_1' } }, res);

  assert.strictEqual(res.statusCode, 500);
});

// ---------- Job posting (delete) ----------

test('JobController.remove deletes an owned posting and unlinks it from the recruiter', async (t) => {
  const calls = stubHappyPath(t);
  const res = createMockRes();

  await JobController.remove({ user: { id: 'rec_1' }, params: { id: 'job_1' } }, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.data.message, 'Job posting deleted.');
  assert.strictEqual(calls.deleted, 'job_1');
  assert.deepStrictEqual(calls.removed, ['rec_1', 'job_1']);
});

test('JobController.remove returns 404 for a missing posting', async (t) => {
  const calls = stubHappyPath(t);
  const res = createMockRes();

  await JobController.remove({ user: { id: 'rec_1' }, params: { id: 'nope' } }, res);

  assert.strictEqual(res.statusCode, 404);
  assert.strictEqual(calls.deleted, undefined);
});

test('JobController.remove forbids deleting another recruiter\'s posting', async (t) => {
  const calls = stubHappyPath(t);
  const res = createMockRes();

  await JobController.remove({ user: { id: 'rec_other' }, params: { id: 'job_1' } }, res);

  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(calls.deleted, undefined);
  assert.strictEqual(calls.removed, undefined);
});

test('JobController.remove returns 500 on database error', async (t) => {
  const calls = stubHappyPath(t);
  t.mock.method(console, 'error', () => {});
  JobPostingModel.delete.mock.mockImplementation(async () => { throw new Error('db down'); });
  const res = createMockRes();

  await JobController.remove({ user: { id: 'rec_1' }, params: { id: 'job_1' } }, res);

  assert.strictEqual(res.statusCode, 500);
  assert.strictEqual(calls.removed, undefined);
});
