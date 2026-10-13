const db = require('../config/db');

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