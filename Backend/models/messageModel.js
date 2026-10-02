const db = require('../config/db');
const ConversationModel = require('./conversationModel');

/**
 * MessageModel
 * Firestore subcollection: `conversations/{conversationId}/messages`
 * Document shape: { id, conversationId, senderId, body, createdAt (ISO string) }
 */
class MessageModel {
  static messagesCol(conversationId) {
    const firestore = db.getFirestore();
    if (!firestore) throw new Error('Firestore database is not initialized');
    return firestore
      .collection(ConversationModel.COLLECTION)
      .doc(String(conversationId))
      .collection('messages');
  }

  static async create(conversationId, { senderId, body }) {
    const ref = this.messagesCol(conversationId).doc();
    const message = {
      id: ref.id,
      conversationId,
      senderId,
      body,
      createdAt: new Date().toISOString()
    };
    await ref.set(message);
    return message;
  }

  /**
   * Chronological history (oldest first).
   * @param {string} conversationId
   * @param {Object} [opts]
   * @param {string} [opts.after] - ISO timestamp; only return newer messages (used for polling)
   */
  static async list(conversationId, { after } = {}) {
    let query = this.messagesCol(conversationId).orderBy('createdAt', 'asc');
    if (after) query = query.where('createdAt', '>', after);
    const snap = await query.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

module.exports = MessageModel;
