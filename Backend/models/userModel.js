const db = require('../config/db');

/**
 * Base User Model (OOP Superclass)
 * Handles global user identity, authentication lookups, and global email uniqueness.
 */
class UserModel {
  static COLLECTION = 'users';

  /**
   * Find a user by email address (case-insensitive) in Firestore
   * Enforces global email uniqueness across all roles.
   * @param {string} email
   * @returns {Promise<Object|null>} User document or null
   */
  static async findByEmail(email) {
    if (!email) return null;
    const normalizedEmail = email.trim().toLowerCase();

    const firestore = db.getFirestore();
    if (!firestore) return null;

    const snapshot = await firestore
      .collection(this.COLLECTION)
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Find a user by ID in Firestore
   * @param {string} id
   * @returns {Promise<Object|null>} User document or null
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
   * Base method to create a new user record in Firestore
   * @param {Object} userData - { email, passwordHash, role, ...extra }
   * @returns {Promise<Object>} Created user record
   */
  static async createUser({ email, passwordHash, role, ...extraData }) {
    const normalizedEmail = email.trim().toLowerCase();
    const firestore = db.getFirestore();
    if (!firestore) throw new Error('Firestore database is not initialized');

    const docRef = firestore.collection(this.COLLECTION).doc();
    const now = new Date().toISOString();

    const userData = {
      id: docRef.id,
      email: normalizedEmail,
      password_hash: passwordHash,
      role,
      ...extraData,
      created_at: now,
      updated_at: now
    };

    await docRef.set(userData);
    return userData;
  }

  /**
   * Update a user record by ID
   * @param {string} id 
   * @param {Object} updateData 
   * @returns {Promise<Object|null>}
   */
  static async updateUser(id, updateData) {
    if (!id) return null;
    const firestore = db.getFirestore();
    if (!firestore) return null;

    const docRef = firestore.collection(this.COLLECTION).doc(String(id));
    const now = new Date().toISOString();
    const dataToSet = { ...updateData, updated_at: now };

    await docRef.update(dataToSet);
    const updatedDoc = await docRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  }

  /**
   * Remove sensitive password_hash field from user object
   * @param {Object} user 
   * @returns {Object|null} Clean user object
   */
  static sanitizeUser(user) {
    if (!user) return null;
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }
}

module.exports = UserModel;
