const UserModel = require('./userModel');
const db = require('../config/db');

/**
 * JobSeekerModel (OOP Subclass extending UserModel)
 * Specializes UserModel with candidate-specific attributes, resume/profile data,
 * and job application tracking while preserving global email uniqueness.
 */
class JobSeekerModel extends UserModel {
  static ROLE = 'Job Seeker';

  /**
   * Create a new Job Seeker in the database
   * @param {Object} params
   * @param {string} params.email
   * @param {string} params.passwordHash
   * @param {Object} [params.profile] - Optional initial profile details
   * @returns {Promise<Object>} Created Job Seeker record
   */
  static async create({ email, passwordHash, profile = {} }) {
    const jobSeekerProfile = {
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      phone: profile.phone || '',
      headline: profile.headline || '',
      bio: profile.bio || '',
      skills: Array.isArray(profile.skills) ? profile.skills : [],
      education: Array.isArray(profile.education) ? profile.education : [],
      workExperience: Array.isArray(profile.workExperience) ? profile.workExperience : [],
      resumeUrl: profile.resumeUrl || null
    };

    return super.createUser({
      email,
      passwordHash,
      role: this.ROLE,
      profile: jobSeekerProfile,
      savedJobs: [],
      appliedJobs: []
    });
  }

  /**
   * Find all users who are Job Seekers
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
   * Update Job Seeker profile fields (skills, bio, education, etc.)
   * @param {string} id 
   * @param {Object} profileUpdates 
   * @returns {Promise<Object>}
   */
  static async updateProfile(id, profileUpdates) {
    const user = await this.findById(id);
    if (!user || user.role !== this.ROLE) {
      throw new Error('Job Seeker not found.');
    }

    const currentProfile = user.profile || {};
    const updatedProfile = {
      ...currentProfile,
      ...profileUpdates
    };

    return this.updateUser(id, { profile: updatedProfile });
  }

  /**
   * Add a work experience entry to the Job Seeker's profile
   * @param {string} id 
   * @param {Object} experienceEntry 
   */
  static async addWorkExperience(id, experienceEntry) {
    const user = await this.findById(id);
    if (!user || user.role !== this.ROLE) {
      throw new Error('Job Seeker not found.');
    }

    const currentExperience = (user.profile && user.profile.workExperience) || [];
    currentExperience.push({
      id: Date.now().toString(),
      ...experienceEntry
    });

    return this.updateProfile(id, { workExperience: currentExperience });
  }

  /**
   * Update skills list for the Job Seeker
   * @param {string} id 
   * @param {Array<string>} skills 
   */
  static async updateSkills(id, skills) {
    return this.updateProfile(id, { skills });
  }
}

module.exports = JobSeekerModel;
