const db = require('../config/db');

/**
 * ApplicationModel
 * Tracks job seeker applications and status (Applied, Interview, Offered, Rejected)
 */
class ApplicationModel {
  static COLLECTION = 'applications';

  static STATUS = {
    APPLIED: 'Applied',
    INTERVIEW: 'Interview',
    OFFERED: 'Offered',
    REJECTED: 'Rejected'
  };

  static VALID_STATUSES = ['Applied', 'Interview', 'Offered', 'Rejected'];

  // Compound key so a user can't apply to the same job twice
  static docId(userId, jobId) {
    return `${String(userId)}_${String(jobId)}`;
  }

  // Create a new application
  static async create({
    userId,
    jobId,
    resumeUrl = null,
    companyId = null,
    jobTitle = '',
    companyName = '',
    applicantName = '',
    applicantEmail = ''
  }) {
    const firestore = db.getFirestore();
    if (!firestore) throw new Error('Firestore database is not initialized');

    const id = this.docId(userId, jobId);
    const docRef = firestore.collection(this.COLLECTION).doc(id);

    const existing = await docRef.get();
    if (existing.exists) {
      const error = new Error('You have already applied for this job.');
      error.code = 'DUPLICATE_APPLICATION';
      throw error;
    }

    const now = new Date().toISOString();
    const data = {
      id,
      userId: String(userId),
      jobId: String(jobId),
      companyId: companyId ? String(companyId) : null,
      resumeUrl: resumeUrl || null,
      status: this.STATUS.APPLIED,
      jobTitle: jobTitle || '',
      companyName: companyName || '',
      applicantName: applicantName || '',
      applicantEmail: applicantEmail || '',
      created_at: now,
      updated_at: now
    };

    await docRef.set(data);
    return data;
  }

  static async findById(id) {
    const firestore = db.getFirestore();
    if (!firestore) return null;

    const doc = await firestore.collection(this.COLLECTION).doc(String(id)).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  // Check if candidate already applied
  static async hasUserApplied(userId, jobId) {
    const app = await this.findById(this.docId(userId, jobId));
    return Boolean(app);
  }

  // Find all applications submitted by a user, newest first
  static async findByUser(userId) {
    const firestore = db.getFirestore();
    if (!firestore) return [];

    const snapshot = await firestore
      .collection(this.COLLECTION)
      .where('userId', '==', String(userId))
      .get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  // Find all applicants for a job
  static async findByJob(jobId) {
    const firestore = db.getFirestore();
    if (!firestore) return [];

    const snapshot = await firestore
      .collection(this.COLLECTION)
      .where('jobId', '==', String(jobId))
      .get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  // Update pipeline status
  static async updateStatus(id, status) {
    if (!this.VALID_STATUSES.includes(status)) {
      const error = new Error(`Invalid status "${status}". Allowed values: ${this.VALID_STATUSES.join(', ')}`);
      error.code = 'INVALID_STATUS';
      throw error;
    }

    const firestore = db.getFirestore();
    if (!firestore) throw new Error('Firestore database is not initialized');

    const docRef = firestore.collection(this.COLLECTION).doc(String(id));
    const doc = await docRef.get();
    if (!doc.exists) {
      const error = new Error('Application not found.');
      error.code = 'NOT_FOUND';
      throw error;
    }

    const updates = {
      status,
      updated_at: new Date().toISOString()
    };

    await docRef.update(updates);
    return { ...doc.data(), ...updates, id: doc.id };
  }
}

module.exports = ApplicationModel;
