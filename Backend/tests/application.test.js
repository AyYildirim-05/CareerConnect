const test = require('node:test');
const assert = require('node:assert');
const db = require('../config/db');
const ApplicationModel = require('../models/applicationModel');
const JobPostingModel = require('../models/jobPostingModel');
const JobSeekerModel = require('../models/jobSeekerModel');
const ApplicationController = require('../controllers/applicationController');

/**
 * Mock response helper for Express controller unit tests
 */
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

/**
 * In-memory Firestore fake supporting doc/collection/get/set/update/delete/where
 */
function createFakeFirestore() {
  const store = {};

  return {
    store,
    collection(name) {
      store[name] = store[name] || {};
      return {
        doc(id) {
          const docId = id || `auto_${Date.now()}_${Math.random()}`;
          return {
            id: docId,
            async get() {
              const data = store[name][docId];
              return {
                id: docId,
                exists: Boolean(data),
                data: () => (data ? { ...data } : undefined)
              };
            },
            async set(data) {
              store[name][docId] = { ...data, id: docId };
            },
            async update(updates) {
              if (!store[name][docId]) {
                const err = new Error('Not found');
                err.code = 5;
                throw err;
              }
              store[name][docId] = { ...store[name][docId], ...updates };
            },
            async delete() {
              delete store[name][docId];
            }
          };
        },
        where(field, op, value) {
          return {
            async get() {
              const docs = Object.entries(store[name] || {})
                .filter(([, v]) => {
                  if (op === '==') return v[field] === value;
                  return false;
                })
                .map(([docId, v]) => ({
                  id: docId,
                  data: () => ({ ...v })
                }));

              return {
                empty: docs.length === 0,
                docs
              };
            }
          };
        }
      };
    }
  };
}

// -----------------------------------------------------------------------------
// ApplicationModel tests
// -----------------------------------------------------------------------------

test('ApplicationModel.docId generates composite key from userId and jobId', () => {
  const id = ApplicationModel.docId('user123', 'job456');
  assert.strictEqual(id, 'user123_job456');
});

test('ApplicationModel.create creates an application with status "Applied"', async () => {
  const fakeDb = createFakeFirestore();
  const origGet = db.getFirestore;
  db.getFirestore = () => fakeDb;

  try {
    const app = await ApplicationModel.create({
      userId: 'user1',
      jobId: 'job1',
      resumeUrl: 'https://example.com/resume.pdf',
      companyId: 'comp1',
      jobTitle: 'Software Engineer',
      companyName: 'TechCorp',
      applicantName: 'Alice Seeker',
      applicantEmail: 'alice@example.com'
    });

    assert.strictEqual(app.id, 'user1_job1');
    assert.strictEqual(app.status, 'Applied');
    assert.strictEqual(app.resumeUrl, 'https://example.com/resume.pdf');
    assert.strictEqual(app.jobTitle, 'Software Engineer');
    assert.ok(app.created_at);
  } finally {
    db.getFirestore = origGet;
  }
});

test('ApplicationModel.create throws error on duplicate application', async () => {
  const fakeDb = createFakeFirestore();
  const origGet = db.getFirestore;
  db.getFirestore = () => fakeDb;

  try {
    await ApplicationModel.create({
      userId: 'user1',
      jobId: 'job1',
      resumeUrl: 'https://example.com/resume.pdf'
    });

    await assert.rejects(
      async () => {
        await ApplicationModel.create({
          userId: 'user1',
          jobId: 'job1',
          resumeUrl: 'https://example.com/resume.pdf'
        });
      },
      (err) => err.code === 'DUPLICATE_APPLICATION'
    );
  } finally {
    db.getFirestore = origGet;
  }
});

test('ApplicationModel.findByUser returns applications for user, sorted newest first', async () => {
  const fakeDb = createFakeFirestore();
  const origGet = db.getFirestore;
  db.getFirestore = () => fakeDb;

  try {
    fakeDb.store.applications = {
      user1_jobA: {
        id: 'user1_jobA',
        userId: 'user1',
        jobId: 'jobA',
        status: 'Applied',
        created_at: '2026-10-01T10:00:00Z'
      },
      user1_jobB: {
        id: 'user1_jobB',
        userId: 'user1',
        jobId: 'jobB',
        status: 'Interview',
        created_at: '2026-10-15T12:00:00Z'
      },
      user2_jobA: {
        id: 'user2_jobA',
        userId: 'user2',
        jobId: 'jobA',
        status: 'Applied',
        created_at: '2026-10-10T10:00:00Z'
      }
    };

    const apps = await ApplicationModel.findByUser('user1');
    assert.strictEqual(apps.length, 2);
    assert.strictEqual(apps[0].id, 'user1_jobB'); // newest first
    assert.strictEqual(apps[1].id, 'user1_jobA');
  } finally {
    db.getFirestore = origGet;
  }
});

test('ApplicationModel.updateStatus transitions status across pipeline', async () => {
  const fakeDb = createFakeFirestore();
  const origGet = db.getFirestore;
  db.getFirestore = () => fakeDb;

  try {
    fakeDb.store.applications = {
      user1_job1: {
        id: 'user1_job1',
        userId: 'user1',
        jobId: 'job1',
        status: 'Applied',
        created_at: '2026-10-01T10:00:00Z'
      }
    };

    const updated = await ApplicationModel.updateStatus('user1_job1', 'Interview');
    assert.strictEqual(updated.status, 'Interview');
    assert.ok(updated.updated_at);
  } finally {
    db.getFirestore = origGet;
  }
});

test('ApplicationModel.updateStatus rejects invalid status not in enum', async () => {
  const fakeDb = createFakeFirestore();
  const origGet = db.getFirestore;
  db.getFirestore = () => fakeDb;

  try {
    await assert.rejects(
      async () => {
        await ApplicationModel.updateStatus('user1_job1', 'Hired');
      },
      (err) => err.code === 'INVALID_STATUS'
    );
  } finally {
    db.getFirestore = origGet;
  }
});

// -----------------------------------------------------------------------------
// ApplicationController tests
// -----------------------------------------------------------------------------

test('ApplicationController.submit succeeds for published job with profile resume', async () => {
  const origFindJob = JobPostingModel.findById;
  const origFindSeeker = JobSeekerModel.findById;
  const origHasApplied = ApplicationModel.hasUserApplied;
  const origCreateApp = ApplicationModel.create;

  JobPostingModel.findById = async (id) => ({
    id,
    title: 'Senior Developer',
    companyName: 'Acme Corp',
    companyId: 'acme1',
    status: JobPostingModel.STATUS_PUBLISHED
  });

  JobSeekerModel.findById = async (id) => ({
    id,
    email: 'seeker@test.com',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      resumeUrl: 'https://cloud.com/resume.pdf'
    }
  });

  JobPostingModel.STATUS_PUBLISHED = 'published';
  ApplicationModel.hasUserApplied = async () => false;
  ApplicationModel.create = async (params) => ({ id: `${params.userId}_${params.jobId}`, ...params, status: 'Applied' });

  try {
    const req = {
      user: { id: 'seeker1', email: 'seeker@test.com', role: 'Job Seeker' },
      body: { jobId: 'job100' }
    };
    const res = createMockRes();

    await ApplicationController.submit(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.application.status, 'Applied');
    assert.strictEqual(res.data.application.applicantName, 'John Doe');
    assert.strictEqual(res.data.application.resumeUrl, 'https://cloud.com/resume.pdf');
  } finally {
    JobPostingModel.findById = origFindJob;
    JobSeekerModel.findById = origFindSeeker;
    ApplicationModel.hasUserApplied = origHasApplied;
    ApplicationModel.create = origCreateApp;
  }
});

test('ApplicationController.submit rejects missing jobId with 400', async () => {
  const req = {
    user: { id: 'seeker1', role: 'Job Seeker' },
    body: {}
  };
  const res = createMockRes();

  await ApplicationController.submit(req, res);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.data.error, 'Job ID is required.');
});

test('ApplicationController.submit returns 404 for unpublished or missing job', async () => {
  const origFindJob = JobPostingModel.findById;
  JobPostingModel.findById = async () => null;

  try {
    const req = {
      user: { id: 'seeker1', role: 'Job Seeker' },
      body: { jobId: 'nonexistent' }
    };
    const res = createMockRes();

    await ApplicationController.submit(req, res);
    assert.strictEqual(res.statusCode, 404);
  } finally {
    JobPostingModel.findById = origFindJob;
  }
});

test('ApplicationController.submit returns 409 when user already applied', async () => {
  const origFindJob = JobPostingModel.findById;
  const origHasApplied = ApplicationModel.hasUserApplied;

  JobPostingModel.findById = async (id) => ({
    id,
    status: JobPostingModel.STATUS_PUBLISHED
  });
  ApplicationModel.hasUserApplied = async () => true;

  try {
    const req = {
      user: { id: 'seeker1', role: 'Job Seeker' },
      body: { jobId: 'job1' }
    };
    const res = createMockRes();

    await ApplicationController.submit(req, res);
    assert.strictEqual(res.statusCode, 409);
    assert.match(res.data.error, /already applied/i);
  } finally {
    JobPostingModel.findById = origFindJob;
    ApplicationModel.hasUserApplied = origHasApplied;
  }
});

test('ApplicationController.submit returns 400 when applicant has no resume', async () => {
  const origFindJob = JobPostingModel.findById;
  const origFindSeeker = JobSeekerModel.findById;
  const origHasApplied = ApplicationModel.hasUserApplied;

  JobPostingModel.findById = async (id) => ({
    id,
    status: JobPostingModel.STATUS_PUBLISHED
  });
  JobSeekerModel.findById = async () => ({
    id: 'seeker1',
    profile: {} // No resume
  });
  ApplicationModel.hasUserApplied = async () => false;

  try {
    const req = {
      user: { id: 'seeker1', role: 'Job Seeker' },
      body: { jobId: 'job1' }
    };
    const res = createMockRes();

    await ApplicationController.submit(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.data.error, /No resume found/i);
  } finally {
    JobPostingModel.findById = origFindJob;
    JobSeekerModel.findById = origFindSeeker;
    ApplicationModel.hasUserApplied = origHasApplied;
  }
});

test('ApplicationController.updateStatus transitions status for owned job posting', async () => {
  const origFindApp = ApplicationModel.findById;
  const origFindJob = JobPostingModel.findById;
  const origUpdate = ApplicationModel.updateStatus;

  ApplicationModel.findById = async (id) => ({
    id,
    jobId: 'job1',
    status: 'Applied'
  });
  JobPostingModel.findById = async (id) => ({
    id,
    recruiterId: 'recruiter1' // Matches req.user.id
  });
  ApplicationModel.updateStatus = async (id, status) => ({
    id,
    status,
    updated_at: new Date().toISOString()
  });

  try {
    const req = {
      user: { id: 'recruiter1', role: 'Recruiter' },
      params: { id: 'app1' },
      body: { status: 'Offered' }
    };
    const res = createMockRes();

    await ApplicationController.updateStatus(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.application.status, 'Offered');
  } finally {
    ApplicationModel.findById = origFindApp;
    JobPostingModel.findById = origFindJob;
    ApplicationModel.updateStatus = origUpdate;
  }
});

test('ApplicationController.updateStatus rejects unauthorized recruiter with 403', async () => {
  const origFindApp = ApplicationModel.findById;
  const origFindJob = JobPostingModel.findById;

  ApplicationModel.findById = async (id) => ({
    id,
    jobId: 'job1',
    status: 'Applied'
  });
  JobPostingModel.findById = async (id) => ({
    id,
    recruiterId: 'other_recruiter' // Does not match req.user.id
  });

  try {
    const req = {
      user: { id: 'recruiter1', role: 'Recruiter' },
      params: { id: 'app1' },
      body: { status: 'Interview' }
    };
    const res = createMockRes();

    await ApplicationController.updateStatus(req, res);

    assert.strictEqual(res.statusCode, 403);
    assert.match(res.data.error, /Forbidden/i);
  } finally {
    ApplicationModel.findById = origFindApp;
    JobPostingModel.findById = origFindJob;
  }
});

test('ApplicationController.updateStatus rejects invalid status value with 400', async () => {
  const req = {
    user: { id: 'recruiter1', role: 'Recruiter' },
    params: { id: 'app1' },
    body: { status: 'NotValidStatus' }
  };
  const res = createMockRes();

  await ApplicationController.updateStatus(req, res);
  assert.strictEqual(res.statusCode, 400);
  assert.match(res.data.error, /Invalid status/i);
});

test('ApplicationController.listMine returns all applications for user', async () => {
  const origFindByUser = ApplicationModel.findByUser;
  ApplicationModel.findByUser = async (userId) => [
    { id: `${userId}_job1`, status: 'Applied' },
    { id: `${userId}_job2`, status: 'Interview' }
  ];

  try {
    const req = {
      user: { id: 'seeker1', role: 'Job Seeker' }
    };
    const res = createMockRes();

    await ApplicationController.listMine(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.applications.length, 2);
  } finally {
    ApplicationModel.findByUser = origFindByUser;
  }
});

