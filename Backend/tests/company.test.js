const test = require('node:test');
const assert = require('node:assert');
const { JobPostingModel, CompanyModel, UserModel } = require('../models');
const CompanyController = require('../controllers/companyController');

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

const validCompany = {
  name: 'Shopify',
  description: 'Commerce platform.',
  industry: 'Software',
  size: '1000+',
  website: 'https://shopify.com',
  location: 'Ottawa, ON'
};

const existingCompany = { id: 'cmp_1', ownerId: 'rec_owner', ...validCompany };

// Default: recruiter has no company and isn't a member; only existingCompany exists
function stubModels(t) {
  const calls = {};
  t.mock.method(CompanyModel, 'findByOwner', async (uid) => (uid === 'rec_owner' ? existingCompany : null));
  t.mock.method(CompanyModel, 'findById', async (id) => (id === 'cmp_1' ? existingCompany : null));
  t.mock.method(CompanyModel, 'findByName', async (name) => (name === existingCompany.name ? existingCompany : null));
  t.mock.method(CompanyModel, 'create', async ({ ownerId, fields }) => {
    calls.created = { ownerId, fields };
    return { id: 'cmp_new', ownerId, ...fields };
  });
  t.mock.method(CompanyModel, 'update', async (id, fields) => {
    calls.updated = [id, fields];
    return { ...existingCompany, ...fields };
  });
  t.mock.method(UserModel, 'findById', async (id) => ({ id, companyId: null }));
  t.mock.method(UserModel, 'updateUser', async (id, data) => { calls.userUpdated = [id, data]; });
  t.mock.method(JobPostingModel, 'updateCompanyName', async (cid, name) => { calls.renamedJobs = [cid, name]; });
  return calls;
}

// ---------- Company creating ----------

test('CompanyController.create creates a company for a recruiter without one', async (t) => {
  const calls = stubModels(t);
  const res = createMockRes();

  await CompanyController.create({ user: { id: 'rec_new' }, body: { ...validCompany, name: '  Lightspeed  ' } }, res);

  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(res.data.message, 'Company page created.');
  assert.strictEqual(calls.created.ownerId, 'rec_new');
  assert.strictEqual(calls.created.fields.name, 'Lightspeed');
});

test('CompanyController.create rejects missing name and description', async (t) => {
  const calls = stubModels(t);
  const res = createMockRes();

  await CompanyController.create({ user: { id: 'rec_new' }, body: { industry: 'Software' } }, res);

  assert.strictEqual(res.statusCode, 400);
  assert.ok(res.data.errors.name);
  assert.ok(res.data.errors.description);
  assert.strictEqual(calls.created, undefined);
});

test('CompanyController.create rejects invalid size and website', async (t) => {
  stubModels(t);
  const res = createMockRes();

  await CompanyController.create(
    { user: { id: 'rec_new' }, body: { ...validCompany, name: 'Other', size: 'huge', website: 'shopify.com' } },
    res
  );

  assert.strictEqual(res.statusCode, 400);
  assert.ok(res.data.errors.size);
  assert.match(res.data.errors.website, /http/);
});

test('CompanyController.create rejects a duplicate company name', async (t) => {
  const calls = stubModels(t);
  const res = createMockRes();

  await CompanyController.create({ user: { id: 'rec_new' }, body: { ...validCompany } }, res);

  assert.strictEqual(res.statusCode, 409);
  assert.match(res.data.errors.name, /already exists/);
  assert.strictEqual(calls.created, undefined);
});

test('CompanyController.create rejects a recruiter who already owns a company', async (t) => {
  const calls = stubModels(t);
  const res = createMockRes();

  await CompanyController.create({ user: { id: 'rec_owner' }, body: { ...validCompany, name: 'Other' } }, res);

  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(calls.created, undefined);
});

test('CompanyController.create rejects a recruiter who is already a member', async (t) => {
  const calls = stubModels(t);
  UserModel.findById.mock.mockImplementation(async (id) => ({ id, companyId: 'cmp_1' }));
  const res = createMockRes();

  await CompanyController.create({ user: { id: 'rec_member' }, body: { ...validCompany, name: 'Other' } }, res);

  assert.strictEqual(res.statusCode, 409);
  assert.match(res.data.error, /member/);
  assert.strictEqual(calls.created, undefined);
});

test('CompanyController.create returns 500 on database error', async (t) => {
  stubModels(t);
  t.mock.method(console, 'error', () => {});
  CompanyModel.create.mock.mockImplementation(async () => { throw new Error('db down'); });
  const res = createMockRes();

  await CompanyController.create({ user: { id: 'rec_new' }, body: { ...validCompany, name: 'Other' } }, res);

  assert.strictEqual(res.statusCode, 500);
});

// ---------- Company joining ----------

test('CompanyController.join adds the recruiter to an existing company', async (t) => {
  const calls = stubModels(t);
  const res = createMockRes();

  await CompanyController.join({ user: { id: 'rec_new' }, params: { id: 'cmp_1' } }, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.data.company.id, 'cmp_1');
  assert.deepStrictEqual(calls.userUpdated, ['rec_new', { companyId: 'cmp_1' }]);
});

test('CompanyController.join returns 404 for an unknown company', async (t) => {
  const calls = stubModels(t);
  const res = createMockRes();

  await CompanyController.join({ user: { id: 'rec_new' }, params: { id: 'nope' } }, res);

  assert.strictEqual(res.statusCode, 404);
  assert.strictEqual(calls.userUpdated, undefined);
});

test('CompanyController.join rejects a recruiter who owns a company', async (t) => {
  const calls = stubModels(t);
  const res = createMockRes();

  await CompanyController.join({ user: { id: 'rec_owner' }, params: { id: 'cmp_1' } }, res);

  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(calls.userUpdated, undefined);
});

test('CompanyController.join rejects a recruiter who is already a member', async (t) => {
  const calls = stubModels(t);
  UserModel.findById.mock.mockImplementation(async (id) => ({ id, companyId: 'cmp_other' }));
  const res = createMockRes();

  await CompanyController.join({ user: { id: 'rec_member' }, params: { id: 'cmp_1' } }, res);

  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(calls.userUpdated, undefined);
});

// ---------- Company editing ----------

test('CompanyController.updateMine edits the company without renaming jobs when name is unchanged', async (t) => {
  const calls = stubModels(t);
  const res = createMockRes();

  await CompanyController.updateMine(
    { user: { id: 'rec_owner' }, body: { ...validCompany, description: 'Updated description.' } },
    res
  );

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.data.company.description, 'Updated description.');
  assert.strictEqual(calls.updated[0], 'cmp_1');
  assert.strictEqual(calls.renamedJobs, undefined);
});

test('CompanyController.updateMine renames job postings when the company name changes', async (t) => {
  const calls = stubModels(t);
  const res = createMockRes();

  await CompanyController.updateMine({ user: { id: 'rec_owner' }, body: { ...validCompany, name: 'Shopify Inc' } }, res);

  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(calls.renamedJobs, ['cmp_1', 'Shopify Inc']);
});

test('CompanyController.updateMine returns 404 when the recruiter has no company', async (t) => {
  const calls = stubModels(t);
  const res = createMockRes();

  await CompanyController.updateMine({ user: { id: 'rec_new' }, body: { ...validCompany } }, res);

  assert.strictEqual(res.statusCode, 404);
  assert.strictEqual(calls.updated, undefined);
});

test('CompanyController.updateMine rejects invalid fields', async (t) => {
  const calls = stubModels(t);
  const res = createMockRes();

  await CompanyController.updateMine({ user: { id: 'rec_owner' }, body: { ...validCompany, name: '' } }, res);

  assert.strictEqual(res.statusCode, 400);
  assert.ok(res.data.errors.name);
  assert.strictEqual(calls.updated, undefined);
});

test('CompanyController.updateMine rejects a name taken by another company', async (t) => {
  const calls = stubModels(t);
  CompanyModel.findByName.mock.mockImplementation(async () => ({ id: 'cmp_other', name: 'Lightspeed' }));
  const res = createMockRes();

  await CompanyController.updateMine({ user: { id: 'rec_owner' }, body: { ...validCompany, name: 'Lightspeed' } }, res);

  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(calls.updated, undefined);
});

test('CompanyController.updateMine returns 500 on database error', async (t) => {
  stubModels(t);
  t.mock.method(console, 'error', () => {});
  CompanyModel.update.mock.mockImplementation(async () => { throw new Error('db down'); });
  const res = createMockRes();

  await CompanyController.updateMine({ user: { id: 'rec_owner' }, body: { ...validCompany } }, res);

  assert.strictEqual(res.statusCode, 500);
});

// ---------- Company logo ----------

const pngFile = { mimetype: 'image/png', buffer: Buffer.from('fake-png') };

test('CompanyController.uploadLogo stores the image as a data URL for the owner', async (t) => {
  const calls = stubModels(t);
  const res = createMockRes();

  await CompanyController.uploadLogo({ user: { id: 'rec_owner' }, file: pngFile }, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(calls.updated[0], 'cmp_1');
  assert.strictEqual(calls.updated[1].logo, `data:image/png;base64,${pngFile.buffer.toString('base64')}`);
  assert.strictEqual(res.data.company.logo, calls.updated[1].logo);
});

test('CompanyController.uploadLogo rejects a request without a file', async (t) => {
  const calls = stubModels(t);
  const res = createMockRes();

  await CompanyController.uploadLogo({ user: { id: 'rec_owner' } }, res);

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(calls.updated, undefined);
});

test('CompanyController.uploadLogo returns 404 for a recruiter who owns no company', async (t) => {
  const calls = stubModels(t);
  const res = createMockRes();

  await CompanyController.uploadLogo({ user: { id: 'rec_member' }, file: pngFile }, res);

  assert.strictEqual(res.statusCode, 404);
  assert.strictEqual(calls.updated, undefined);
});

test('CompanyController.removeLogo clears the logo', async (t) => {
  const calls = stubModels(t);
  const res = createMockRes();

  await CompanyController.removeLogo({ user: { id: 'rec_owner' } }, res);

  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(calls.updated, ['cmp_1', { logo: null }]);
});
