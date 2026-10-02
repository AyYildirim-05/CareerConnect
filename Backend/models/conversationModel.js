const admin = require('firebase-admin');
const db = require('../config/db');

/**
 * ConversationModel
 * Firestore collection: `conversations`
 * Messages live in the subcollection `conversations/{id}/messages` (see messageModel.js),
 * which lets us order by createdAt without needing a composite index.
 *
 * Document shape:
 * {
 *   id, participantIds: [userIdA, userIdB],
 *   participants: { [userId]: { email, role } },
 *   createdBy, lastMessage: { body, senderId, createdAt } | null,
 *   lastMessageAt: ISO string | null,
 *   unreadCounts: { [userId]: number },
 *   created_at, updated_at
 * }
 */
class ConversationModel {
  static COLLECTION = 'conversations';

  static col() {
    const firestore = db.getFirestore();
    if (!firestore) throw new Error('Firestore database is not initialized');
    return firestore.collection(this.COLLECTION);
  }

  static async findById(id) {
    if (!id) return null;
    const doc = await this.col().doc(String(id)).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  /** Find the existing 1-to-1 thread between two users (if any). */
  static async findBetween(userIdA, userIdB) {
    const snap = await this.col().where('participantIds', 'array-contains', userIdA).get();
    const doc = snap.docs.find((d) => d.data().participantIds.includes(userIdB));
    return doc ? { id: doc.id, ...doc.data() } : null;
  }

  static async create(creator, recipient) {
    const ref = this.col().doc();
    const now = new Date().toISOString();
    const data = {
      id: ref.id,
      participantIds: [creator.id, recipient.id],
      participants: {
        [creator.id]: { email: creator.email, role: creator.role },
        [recipient.id]: { email: recipient.email, role: recipient.role }
      },
      createdBy: creator.id,
      lastMessage: null,
      lastMessageAt: null,
      unreadCounts: { [creator.id]: 0, [recipient.id]: 0 },
      created_at: now,
      updated_at: now
    };
    await ref.set(data);
    return data;
  }

  /** All threads for a user, most recent activity first. */
  static async listForUser(userId) {
    const snap = await this.col().where('participantIds', 'array-contains', userId).get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) =>
        (b.lastMessageAt || b.created_at).localeCompare(a.lastMessageAt || a.created_at)
      );
  }

  /** Update preview + bump the unread counter for everyone except the sender. */
  static async recordMessage(conversation, message) {
    const updates = {
      lastMessage: {
        body: message.body,
        senderId: message.senderId,
        createdAt: message.createdAt
      },
      lastMessageAt: message.createdAt,
      updated_at: message.createdAt
    };
    conversation.participantIds
      .filter((id) => id !== message.senderId)
      .forEach((id) => {
        updates[`unreadCounts.${id}`] = admin.firestore.FieldValue.increment(1);
      });
    await this.col().doc(conversation.id).update(updates);
  }

  static async markRead(conversationId, userId) {
    await this.col().doc(conversationId).update({ [`unreadCounts.${userId}`]: 0 });
  }
}

module.exports = ConversationModel;
