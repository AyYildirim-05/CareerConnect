const db = require('../config/db');

/**
 * CompanyModel
 * A company page owned by a Recruiter. Every Recruiter sets up exactly one
 * company, and all of their job postings belong to it.
 */
class CompanyModel {
  static COLLECTION = 'companies';
  static COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];
  static FIELDS = ['name', 'description', 'industry', 'size', 'website', 'location'];

  /**
   * Create a new company in Firestore
   * @param {Object} params
   * @param {string} params.ownerId - The Recruiter who manages this company
   * @param {Object} params.fields - { name, description, industry, size, website, location }
   * @returns {Promise<Object>} Created company
   */
  static async create({ ownerId, fields }) {
    const firestore = db.getFirestore();
    if (!firestore) throw new Error('Firestore database is not initialized');

    const docRef = firestore.collection(this.COLLECTION).doc();
    const now = new Date().toISOString();

    const companyData = {
      id: docRef.id,
      ownerId: String(ownerId),
      ...fields,
      nameLower: (fields.name || '').trim().toLowerCase(),
      created_at: now,
      updated_at: now
    };

    await docRef.set(companyData);
    return companyData;
  }

  /**
   * Find a company by name (case-insensitive)
   * @param {string} name
   * @returns {Promise<Object|null>}
   */
  static async findByName(name) {
    const nameLower = (name || '').trim().toLowerCase();
    if (!nameLower) return null;
    const firestore = db.getFirestore();
    if (!firestore) return null;

    const snapshot = await firestore
      .collection(this.COLLECTION)
      .where('nameLower', '==', nameLower)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }

  /**
   * Find a company by ID
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
   * Find all companies, sorted by name
   * @returns {Promise<Array<Object>>}
   */
  static async findAll() {
    const firestore = db.getFirestore();
    if (!firestore) return [];

    const snapshot = await firestore.collection(this.COLLECTION).get();
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  /**
   * Find the company owned by a Recruiter (each Recruiter has exactly one)
   * @param {string} ownerId
   * @returns {Promise<Object|null>}
   */
  static async findByOwner(ownerId) {
    const firestore = db.getFirestore();
    if (!firestore) return null;

    const snapshot = await firestore
      .collection(this.COLLECTION)
      .where('ownerId', '==', String(ownerId))
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Update the editable fields of a company
   * @param {string} id
   * @param {Object} fields
   * @returns {Promise<Object|null>}
   */
  static async update(id, fields) {
    if (!id) return null;
    const firestore = db.getFirestore();
    if (!firestore) return null;

    const docRef = firestore.collection(this.COLLECTION).doc(String(id));
    const updateData = { ...fields, updated_at: new Date().toISOString() };
    if (fields.name !== undefined) {
      updateData.nameLower = fields.name.trim().toLowerCase();
    }
    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  }
}

module.exports = CompanyModel;
