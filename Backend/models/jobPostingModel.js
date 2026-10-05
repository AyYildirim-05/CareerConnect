const db = require('../config/db');

/**
 * JobPostingModel
 * Handles job listings created by Recruiters. A posting starts as a 'draft'
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
   * @param {string} params.companyName
   * @param {Object} params.fields - { title, description, department, location, jobType, workMode, requirements }
   * @param {boolean} [params.publish=false] - Publish immediately instead of saving as draft
   * @returns {Promise<Object>} Created job posting
   */
  static async create({ recruiterId, companyName, fields, publish = false }) {
    const firestore = db.getFirestore();
    if (!firestore) throw new Error('Firestore database is not initialized');

    const docRef = firestore.collection(this.COLLECTION).doc();
    const now = new Date().toISOString();

    const jobData = {
      id: docRef.id,
      recruiterId: String(recruiterId),
      companyName: companyName || '',
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
   * Find all published postings (the active job listings), newest first
   * @returns {Promise<Array<Object>>}
   */
  static async findPublished() {
    const firestore = db.getFirestore();
    if (!firestore) return [];

    const snapshot = await firestore
      .collection(this.COLLECTION)
      .where('status', '==', this.STATUS_PUBLISHED)
      .get();

    // Sorted in JS to avoid needing a Firestore composite index
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
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
