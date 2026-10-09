const UserModel = require('./userModel');
const db = require('../config/db');

/**
 * RecruiterModel (OOP Subclass extending UserModel)
 * Specializes UserModel with recruiter-specific attributes, company information,
 * job listing associations, and screening question templates.
 */
class RecruiterModel extends UserModel {
  static ROLE = 'Recruiter';

  /**
   * Create a new Recruiter in the database
   * @param {Object} params
   * @param {string} params.email
   * @param {string} params.passwordHash
   * @param {Object} [params.companyProfile] - Optional initial company/recruiter details
   * @returns {Promise<Object>} Created Recruiter record
   */
  static async create({ email, passwordHash, companyProfile = {} }) {
    const recruiterData = {
      firstName: companyProfile.firstName || '',
      lastName: companyProfile.lastName || '',
      phone: companyProfile.phone || '',
      companyName: companyProfile.companyName || '',
      companyWebsite: companyProfile.companyWebsite || '',
      position: companyProfile.position || '',
      department: companyProfile.department || '',
      location: companyProfile.location || ''
    };

    return super.createUser({
      email,
      passwordHash,
      role: this.ROLE,
      recruiterProfile: recruiterData,
      jobPostings: [],
      questionTemplates: []
    });
  }

  /**
   * Find all users who are Recruiters
   * @returns {Promise<Array<Object>>}
   */
  static async findAll() {
    const firestore = db.getFirestore();
    if (!firestore) return [];

    const snapshot = await firestore
      .collection(this.COLLECTION)
      .where('role', '==', this.ROLE)
      .get();

    return snapshot.docs.map(doc => this.sanitizeUser({ id: doc.id, ...doc.data() }));
  }

  /**
   * Update Recruiter company and personal info
   * @param {string} id 
   * @param {Object} profileUpdates 
   * @returns {Promise<Object>}
   */
  static async updateCompanyProfile(id, profileUpdates) {
    const user = await this.findById(id);
    if (!user || user.role !== this.ROLE) {
      throw new Error('Recruiter not found.');
    }

    const currentProfile = user.recruiterProfile || {};
    const updatedProfile = {
      ...currentProfile,
      ...profileUpdates
    };

    return this.updateUser(id, { recruiterProfile: updatedProfile });
  }

  /**
   * Attach a new job posting ID to the recruiter's active listings
   * @param {string} id 
   * @param {string} jobPostingId 
   */
  static async addJobPosting(id, jobPostingId) {
    const user = await this.findById(id);
    if (!user || user.role !== this.ROLE) {
      throw new Error('Recruiter not found.');
    }

    const currentPostings = user.jobPostings || [];
    if (!currentPostings.includes(jobPostingId)) {
      currentPostings.push(jobPostingId);
    }

    return this.updateUser(id, { jobPostings: currentPostings });
  }

  /**
   * Detach a deleted job posting ID from the recruiter's listings
   * @param {string} id
   * @param {string} jobPostingId
   */
  static async removeJobPosting(id, jobPostingId) {
    const user = await this.findById(id);
    if (!user || user.role !== this.ROLE) {
      throw new Error('Recruiter not found.');
    }

    const currentPostings = (user.jobPostings || []).filter(postingId => postingId !== jobPostingId);
    return this.updateUser(id, { jobPostings: currentPostings });
  }
}

module.exports = RecruiterModel;
