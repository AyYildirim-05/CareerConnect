const db = require('../config/db');

/**
 * JobPostingModel
 * Handles job listings created by Recruiters. Every posting belongs to a company
 * owned by its Recruiter. A posting starts as a 'draft'
 * and becomes visible in the active job listings once it is 'published'.
 */
class JobPostingModel {
  static COLLECTION = 'jobPostings';
  static STATUS_DRAFT = 'draft';
  static STATUS_PUBLISHED = 'published';
  static JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];
  static WORK_MODES = ['On-site', 'Remote', 'Hybrid'];

  /**
   * Create a new job posting in Firestore
   * @param {Object} params
   * @param {string} params.recruiterId
   * @param {Object} params.company - The company this job is posted under
   * @param {Object} params.fields - { title, description, department, location, jobType, workMode, requirements }
   * @param {boolean} [params.publish=false] - Publish immediately instead of saving as draft
   * @returns {Promise<Object>} Created job posting
   */
  static async create({ recruiterId, company, fields, publish = false }) {
    const firestore = db.getFirestore();
    if (!firestore) throw new Error('Firestore database is not initialized');

    const docRef = firestore.collection(this.COLLECTION).doc();
    const now = new Date().toISOString();

    const jobData = {
      id: docRef.id,
      recruiterId: String(recruiterId),
      companyId: company.id,
      companyName: company.name,
      ...fields,
      status: publish ? this.STATUS_PUBLISHED : this.STATUS_DRAFT,
      publishedAt: publish ? now : null,
      created_at: now,
      updated_at: now
    };

    await docRef.set(jobData);
    return jobData;
  }

  /**
   * Find a job posting by ID
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    if (!id) return null;
    const firestore = db.getFirestore();
    if (!firestore) return null;

    const doc = await firestore.collection(this.COLLECTION).doc(String(id)).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Filter and search a list of job postings in memory
   * @param {Array<Object>} jobs - List of job objects
   * @param {Object} [filters={}] - Search criteria
   * @param {string} [filters.keyword] - Search query matching title, company name, or description
   * @param {string} [filters.location] - Search query matching location
   * @param {string} [filters.type] - Search query matching employment type (jobType)
   * @param {string} [filters.workMode] - Search query matching work mode (On-site, Remote, Hybrid)
   * @returns {Array<Object>}
   */
  static filterJobs(jobs = [], filters = {}) {
    if (!Array.isArray(jobs)) return [];
    let filtered = [...jobs];
    const { keyword, location, type, workMode } = filters;

    if (keyword && typeof keyword === 'string' && keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      const tokens = kw.split(/\s+/).filter(Boolean);
      filtered = filtered.filter(job => {
        const text = `${job.title || ''} ${job.companyName || ''} ${job.description || ''} ${job.department || ''} ${job.requirements || ''}`.toLowerCase();
        return text.includes(kw) || (tokens.length > 1 && tokens.every(token => text.includes(token)));
      });
    }

    if (location && typeof location === 'string' && location.trim()) {
      const loc = location.trim().toLowerCase();
      filtered = filtered.filter(job => job.location && job.location.toLowerCase().includes(loc));
    }

    if (type && typeof type === 'string' && type.trim()) {
      const t = type.trim().toLowerCase();
      filtered = filtered.filter(job => job.jobType && job.jobType.toLowerCase() === t);
    }

    if (workMode && typeof workMode === 'string' && workMode.trim()) {
      const wm = workMode.trim().toLowerCase();
      filtered = filtered.filter(job => job.workMode && job.workMode.toLowerCase() === wm);
    }

    return filtered;
  }

  /**
   * Find all published postings (the active job listings), newest first, with optional multi-criteria filtering
   * @param {Object} [filters={}] - Optional filters: { keyword, location, type, workMode }
   * @returns {Promise<Array<Object>>}
   */
  static async findPublished(filters = {}) {
    const firestore = db.getFirestore();
    if (!firestore) return [];

    const snapshot = await firestore
      .collection(this.COLLECTION)
      .where('status', '==', this.STATUS_PUBLISHED)
      .get();

    // Sorted in JS to avoid needing a Firestore composite index
    const jobs = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));

    return this.filterJobs(jobs, filters);
  }

  /**
   * Find all postings (drafts and published) owned by a Recruiter, newest first
   * @param {string} recruiterId
   * @returns {Promise<Array<Object>>}
   */
  static async findByRecruiter(recruiterId) {
    const firestore = db.getFirestore();
    if (!firestore) return [];

    const snapshot = await firestore
      .collection(this.COLLECTION)
      .where('recruiterId', '==', String(recruiterId))
      .get();

    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  /**
   * Find the published postings of one company (shown on its company page), newest first
   * @param {string} companyId
   * @returns {Promise<Array<Object>>}
   */
  static async findPublishedByCompany(companyId) {
    const firestore = db.getFirestore();
    if (!firestore) return [];

    const snapshot = await firestore
      .collection(this.COLLECTION)
      .where('companyId', '==', String(companyId))
      .get();

    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(job => job.status === this.STATUS_PUBLISHED)
      .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
  }

  /**
   * Copy a new company name onto all of a company's postings,
   * so listings stay correct after the company is renamed
   * @param {string} companyId
   * @param {string} companyName
   */
  static async updateCompanyName(companyId, companyName) {
    const firestore = db.getFirestore();
    if (!firestore) return;

    const snapshot = await firestore
      .collection(this.COLLECTION)
      .where('companyId', '==', String(companyId))
      .get();
    if (snapshot.empty) return;

    const batch = firestore.batch();
    snapshot.docs.forEach(doc => batch.update(doc.ref, { companyName }));
    await batch.commit();
  }

  /**
   * Update the editable fields of a job posting
   * @param {string} id
   * @param {Object} fields
   * @returns {Promise<Object|null>}
   */
  static async update(id, fields) {
    if (!id) return null;
    const firestore = db.getFirestore();
    if (!firestore) return null;

    const docRef = firestore.collection(this.COLLECTION).doc(String(id));
    const dataToSet = { ...fields, updated_at: new Date().toISOString() };

    await docRef.update(dataToSet);
    const updatedDoc = await docRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  }

  /**
   * Permanently delete a job posting
   * @param {string} id
   */
  static async delete(id) {
    if (!id) return;
    const firestore = db.getFirestore();
    if (!firestore) throw new Error('Firestore database is not initialized');

    await firestore.collection(this.COLLECTION).doc(String(id)).delete();
  }

  /**
   * Publish a job posting so it appears in the active job listings
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  static async publish(id) {
    return this.update(id, {
      status: this.STATUS_PUBLISHED,
      publishedAt: new Date().toISOString()
    });
  }
}

module.exports = JobPostingModel;
