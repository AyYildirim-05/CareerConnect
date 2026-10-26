const test = require('node:test');
const assert = require('node:assert');
const db = require('../config/db');
const SavedJobModel = require('../models/savedJobModel');
const JobPostingModel = require('../models/jobPostingModel');
const SavedJobController = require('../controllers/savedJobController');

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
 * Minimal in-memory Firestore fake
 */
function createFakeFirestore() {
  const store = {}; // { collectionName: { docId: data } }

  return {
    store,
    collection(name) {
      store[name] = store[name] || {};
      return {
        doc(id) {
          return {
            async set(data) {
              store[name][id] = data;
            },
            async delete() {
              delete store[name][id];
            }
          };
        },
        where(field, op, value) {
          return {
            async get() {
              const docs = Object.entries(store[name])
                .filter(([, data]) => data[field] === value)
                .map(([id, data]) => ({ id, data: () => data }));
              return { docs, empty: docs.length === 0 };
            }
          };
        }
      };
    }
  };
}

/**
 * Swap db.getFirestore for the duration of a test, then restore it
 */
async function withFirestore(fake, fn) {
  const original = db.getFirestore;
  db.getFirestore = () => fake;
  try {
    await fn();
  } finally {
    db.getFirestore = original;
  }
}

// Silence expected console.error output from error-path tests
async function quietly(fn) {
  const original = console.error;
  console.error = () => {};
  try {
    await fn();
  } finally {
    console.error = original;
  }
}

const publishedJob = {
  id: 'job_1',
  title: 'Frontend Developer',
  companyName: 'Klick Health',
  status: 'published'
};

// ---------------------------------------------------------------------------
// SavedJobModel
// ---------------------------------------------------------------------------

test('SavedJobModel.docId combines user and job IDs so a pair can only exist once', () => {
  assert.strictEqual(SavedJobModel.docId('user1', 'job1'), 'user1_job1');
  assert.strictEqual(SavedJobModel.docId(42, 7), '42_7');
});

test('SavedJobModel.save writes a savedJobs document linking userId and jobId', async () => {
  const fake = createFakeFirestore();

  await withFirestore(fake, async () => {
    const saved = await SavedJobModel.save('user1', 'job1');

    assert.strictEqual(saved.id, 'user1_job1');
    assert.strictEqual(saved.userId, 'user1');
    assert.strictEqual(saved.jobId, 'job1');
    assert.ok(saved.created_at);

    assert.ok(fake.store[SavedJobModel.COLLECTION]['user1_job1']);
    assert.strictEqual(fake.store[SavedJobModel.COLLECTION]['user1_job1'].jobId, 'job1');
  });
});

test('SavedJobModel.save twice for the same user and job does not create a duplicate', async () => {
  const fake = createFakeFirestore();

  await withFirestore(fake, async () => {
    await SavedJobModel.save('user1', 'job1');
    await SavedJobModel.save('user1', 'job1');

    assert.strictEqual(Object.keys(fake.store[SavedJobModel.COLLECTION]).length, 1);
  });
});

test('SavedJobModel.remove deletes only the matching saved job', async () => {
  const fake = createFakeFirestore();

  await withFirestore(fake, async () => {
    await SavedJobModel.save('user1', 'job1');
    await SavedJobModel.save('user1', 'job2');

    await SavedJobModel.remove('user1', 'job1');

    const remaining = Object.keys(fake.store[SavedJobModel.COLLECTION]);
    assert.deepStrictEqual(remaining, ['user1_job2']);
  });
});

test('SavedJobModel.remove on a job that was never saved does not throw', async () => {
  const fake = createFakeFirestore();

  await withFirestore(fake, async () => {
    await assert.doesNotReject(() => SavedJobModel.remove('user1', 'never_saved'));
  });
});

test('SavedJobModel.findByUser returns only that user\'s saves, newest first', async () => {
  const fake = createFakeFirestore();

  await withFirestore(fake, async () => {
    const col = fake.collection(SavedJobModel.COLLECTION);
    await col.doc('user1_old').set({ userId: 'user1', jobId: 'old', created_at: '2026-01-01T00:00:00.000Z' });
    await col.doc('user1_new').set({ userId: 'user1', jobId: 'new', created_at: '2026-06-01T00:00:00.000Z' });
    await col.doc('user2_other').set({ userId: 'user2', jobId: 'other', created_at: '2026-03-01T00:00:00.000Z' });

    const saves = await SavedJobModel.findByUser('user1');

    assert.strictEqual(saves.length, 2);
    assert.deepStrictEqual(saves.map((s) => s.jobId), ['new', 'old']);
  });
});

test('SavedJobModel.findByUser returns an empty array when the user has no saves', async () => {
  const fake = createFakeFirestore();

  await withFirestore(fake, async () => {
    const saves = await SavedJobModel.findByUser('user_without_saves');
    assert.deepStrictEqual(saves, []);
  });
});

test('SavedJobModel handles an uninitialized database safely', async () => {
  await withFirestore(null, async () => {
    await assert.rejects(() => SavedJobModel.save('u', 'j'), { message: 'Firestore database is not initialized' });
    await assert.rejects(() => SavedJobModel.remove('u', 'j'), { message: 'Firestore database is not initialized' });
    assert.deepStrictEqual(await SavedJobModel.findByUser('u'), []);
  });
});

// ---------------------------------------------------------------------------
// SavedJobController
// ---------------------------------------------------------------------------

test('SavedJobController.save returns 201 and stores the save for a published job', async () => {
  const originalFindById = JobPostingModel.findById;
  const originalSave = SavedJobModel.save;
  let savedArgs = null;

  JobPostingModel.findById = async (id) => (id === publishedJob.id ? publishedJob : null);
  SavedJobModel.save = async (userId, jobId) => {
    savedArgs = { userId, jobId };
  };

  try {
    const req = { user: { id: 'user1' }, params: { id: 'job_1' } };
    const res = createMockRes();
    await SavedJobController.save(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.deepStrictEqual(res.data, { saved: true });
    assert.deepStrictEqual(savedArgs, { userId: 'user1', jobId: 'job_1' });
  } finally {
    JobPostingModel.findById = originalFindById;
    SavedJobModel.save = originalSave;
  }
});

test('SavedJobController.save returns 404 for a job that does not exist', async () => {
  const originalFindById = JobPostingModel.findById;
  const originalSave = SavedJobModel.save;
  let saveCalled = false;

  JobPostingModel.findById = async () => null;
  SavedJobModel.save = async () => {
    saveCalled = true;
  };

  try {
    const req = { user: { id: 'user1' }, params: { id: 'doesnotexist' } };
    const res = createMockRes();
    await SavedJobController.save(req, res);

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.data.error, 'Job not found.');
    assert.strictEqual(saveCalled, false);
  } finally {
    JobPostingModel.findById = originalFindById;
    SavedJobModel.save = originalSave;
  }
});

test('SavedJobController.save returns 404 for a draft (unpublished) job', async () => {
  const originalFindById = JobPostingModel.findById;
  const originalSave = SavedJobModel.save;
  let saveCalled = false;

  JobPostingModel.findById = async () => ({ ...publishedJob, status: 'draft' });
  SavedJobModel.save = async () => {
    saveCalled = true;
  };

  try {
    const req = { user: { id: 'user1' }, params: { id: 'job_1' } };
    const res = createMockRes();
    await SavedJobController.save(req, res);

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(saveCalled, false);
  } finally {
    JobPostingModel.findById = originalFindById;
    SavedJobModel.save = originalSave;
  }
});

test('SavedJobController.save returns 500 when the database fails', async () => {
  const originalFindById = JobPostingModel.findById;
  JobPostingModel.findById = async () => {
    throw new Error('Firestore connection timeout');
  };

  try {
    await quietly(async () => {
      const req = { user: { id: 'user1' }, params: { id: 'job_1' } };
      const res = createMockRes();
      await SavedJobController.save(req, res);

      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.data.error, 'Failed to save job.');
    });
  } finally {
    JobPostingModel.findById = originalFindById;
  }
});

test('SavedJobController.unsave returns 200 and removes the save', async () => {
  const originalRemove = SavedJobModel.remove;
  let removedArgs = null;

  SavedJobModel.remove = async (userId, jobId) => {
    removedArgs = { userId, jobId };
  };

  try {
    const req = { user: { id: 'user1' }, params: { id: 'job_1' } };
    const res = createMockRes();
    await SavedJobController.unsave(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.data, { saved: false });
    assert.deepStrictEqual(removedArgs, { userId: 'user1', jobId: 'job_1' });
  } finally {
    SavedJobModel.remove = originalRemove;
  }
});

test('SavedJobController.unsave returns 500 when the database fails', async () => {
  const originalRemove = SavedJobModel.remove;
  SavedJobModel.remove = async () => {
    throw new Error('Firestore connection timeout');
  };

  try {
    await quietly(async () => {
      const req = { user: { id: 'user1' }, params: { id: 'job_1' } };
      const res = createMockRes();
      await SavedJobController.unsave(req, res);

      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.data.error, 'Failed to remove saved job.');
    });
  } finally {
    SavedJobModel.remove = originalRemove;
  }
});

test('SavedJobController.listMine returns saved jobs and skips deleted or unpublished ones', async () => {
  const originalFindByUser = SavedJobModel.findByUser;
  const originalFindById = JobPostingModel.findById;

  SavedJobModel.findByUser = async () => [
    { jobId: 'job_1' },
    { jobId: 'job_deleted' },
    { jobId: 'job_draft' },
    { jobId: 'job_2' }
  ];

  const jobs = {
    job_1: publishedJob,
    job_2: { ...publishedJob, id: 'job_2', title: 'Backend Developer' },
    job_draft: { ...publishedJob, id: 'job_draft', status: 'draft' }
    // job_deleted intentionally missing
  };
  JobPostingModel.findById = async (id) => jobs[id] || null;

  try {
    const req = { user: { id: 'user1' } };
    const res = createMockRes();
    await SavedJobController.listMine(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.data.jobs.map((j) => j.id), ['job_1', 'job_2']);
  } finally {
    SavedJobModel.findByUser = originalFindByUser;
    JobPostingModel.findById = originalFindById;
  }
});

test('SavedJobController.listMine returns an empty list when the user has no saved jobs', async () => {
  const originalFindByUser = SavedJobModel.findByUser;
  SavedJobModel.findByUser = async () => [];

  try {
    const req = { user: { id: 'user1' } };
    const res = createMockRes();
    await SavedJobController.listMine(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.data, { jobs: [] });
  } finally {
    SavedJobModel.findByUser = originalFindByUser;
  }
});

test('SavedJobController.listMine returns 500 when the database fails', async () => {
  const originalFindByUser = SavedJobModel.findByUser;
  SavedJobModel.findByUser = async () => {
    throw new Error('Firestore connection timeout');
  };

  try {
    await quietly(async () => {
      const req = { user: { id: 'user1' } };
      const res = createMockRes();
      await SavedJobController.listMine(req, res);

      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.data.error, 'Failed to load saved jobs.');
    });
  } finally {
    SavedJobModel.findByUser = originalFindByUser;
  }
});