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

   // Aggregate application analytics for a Job Seeker
   // Supports optional ISO date range filtering (startDate, endDate)
  static async getStatsByUser(userId, { startDate, endDate } = {}) {
    let applications = await this.findByUser(userId);

    // Filter by date range if provided
    if (startDate) {
      const start = startDate.includes('T')
        ? new Date(startDate).toISOString()
        : new Date(`${startDate}T00:00:00.000Z`).toISOString();
      applications = applications.filter((app) => (app.created_at || '') >= start);
    }
    if (endDate) {
      const end = endDate.includes('T')
        ? new Date(endDate).toISOString()
        : new Date(`${endDate}T23:59:59.999Z`).toISOString();
      applications = applications.filter((app) => (app.created_at || '') <= end);
    }

    // Initialize counts grouped by status
    const statusCounts = {
      Applied: 0,
      Interview: 0,
      Offered: 0,
      Rejected: 0
    };

    const monthlyMap = {};

    applications.forEach((app) => {
      const status = this.VALID_STATUSES.includes(app.status) ? app.status : 'Applied';
      statusCounts[status] += 1;

      // Group by YYYY-MM for monthly timeline chart
      if (app.created_at) {
        const monthKey = app.created_at.slice(0, 7); // e.g., "2026-09"
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = {
            month: monthKey,
            total: 0,
            Applied: 0,
            Interview: 0,
            Offered: 0,
            Rejected: 0
          };
        }
        monthlyMap[monthKey].total += 1;
        monthlyMap[monthKey][status] += 1;
      }
    });

    const total = applications.length;
    // Responses = any application that moved past initial 'Applied' state
    const respondedCount = statusCounts.Interview + statusCounts.Offered + statusCounts.Rejected;
    const interviewStageCount = statusCounts.Interview + statusCounts.Offered;

    const metrics = {
      totalSubmitted: total,
      appliedCount: statusCounts.Applied,
      interviewInvites: statusCounts.Interview,
      offers: statusCounts.Offered,
      rejections: statusCounts.Rejected,
      responseRate: total > 0 ? Number(((respondedCount / total) * 100).toFixed(1)) : 0,
      interviewRate: total > 0 ? Number(((interviewStageCount / total) * 100).toFixed(1)) : 0,
      offerConversionRate: interviewStageCount > 0
        ? Number(((statusCounts.Offered / interviewStageCount) * 100).toFixed(1))
        : 0
    };

    const monthlyActivity = Object.values(monthlyMap).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    return {
      metrics,
      statusCounts,
      monthlyActivity,
      applications
    };
  }
}

module.exports = ApplicationModel;
