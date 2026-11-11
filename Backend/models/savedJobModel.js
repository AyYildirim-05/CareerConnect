const db = require('../config/db');
const NotificationModel = require('./notificationModel');

/**
 * SavedJobModel
 * Join collection linking a user to a job posting they bookmarked.
 * Doc ID made in a way that guarantees saving twice can never create a duplicate.
 */
class SavedJobModel {
  static COLLECTION = 'savedJobs';

  static docId(userId, jobId) {
    return `${String(userId)}_${String(jobId)}`;
  }

  static async save(userId, jobId) {
    const firestore = db.getFirestore();
    if (!firestore) throw new Error('Firestore database is not initialized');

    const jobDoc = await firestore.collection('jobPostings').doc(String(jobId)).get();
    
    let message = `You saved this job successfully.`;
    
    if (jobDoc.exists) {
      const job = jobDoc.data();
      
      // Fallback: If expiresAt is missing (old job), compute it as 30 days from creation or now
      let expirationIso = job.expiresAt;
      if (!expirationIso) {
        const baseDate = job.created_at ? new Date(job.created_at) : new Date();
        const fallbackExp = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        expirationIso = fallbackExp.toISOString();
      }

      const now = new Date();
      const expirationDate = new Date(expirationIso); // Uses computed expirationIso
      const diffTime = expirationDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Format the message based on your custom rule
      if (diffDays <= 3) {
        message = `expires SOON: ${diffDays > 0 ? diffDays : 0} days left for "${job.title}"!`;
      } else {
        message = `Saved "${job.title}": ${diffDays} days left before it expires.`;
      }

      // Create the notification instantly upon saving
      await NotificationModel.create({
        userId,
        jobId: String(jobId),
        jobTitle: job.title,
        message,
        expiresAt: expirationIso // Uses computed expirationIso
      });
    }

    const data = {
      id: this.docId(userId, jobId),
      userId: String(userId),
      jobId: String(jobId),
      created_at: new Date().toISOString()
    };
    await firestore.collection(this.COLLECTION).doc(data.id).set(data);
    return data;
  }

  static async remove(userId, jobId) {
    const firestore = db.getFirestore();
    if (!firestore) throw new Error('Firestore database is not initialized');

    await firestore.collection(this.COLLECTION).doc(this.docId(userId, jobId)).delete();
  }

  /** All saves for one user, newest first */
  static async findByUser(userId) {
    const firestore = db.getFirestore();
    if (!firestore) return [];

    const snapshot = await firestore
      .collection(this.COLLECTION)
      .where('userId', '==', String(userId))
      .get();

    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }
}

module.exports = SavedJobModel;