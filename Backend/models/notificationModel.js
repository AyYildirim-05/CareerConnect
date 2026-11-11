const db = require('../config/db');

class NotificationModel {
  static COLLECTION = 'notifications';

  static async create({ userId, jobId, jobTitle, message, expiresAt }) {
    const firestore = db.getFirestore();
    if (!firestore) throw new Error('Firestore database is not initialized');

    const docRef = firestore.collection(this.COLLECTION).doc();
    const now = new Date().toISOString();

    const notification = {
      id: docRef.id,
      userId: String(userId),
      jobId: String(jobId),
      jobTitle,
      message,
      expiresAt,
      read: false,
      created_at: now
    };

    await docRef.set(notification);
    return notification;
  }

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

  static async markAsRead(notificationId, userId) {
    const firestore = db.getFirestore();
    if (!firestore) return null;

    const docRef = firestore.collection(this.COLLECTION).doc(String(notificationId));
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== String(userId)) return null;

    await docRef.update({ read: true });
    return { id: doc.id, ...doc.data(), read: true };
  }
}

module.exports = NotificationModel;