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
   * Save parsed JSON resume profile to Firestore and sync relevant profile fields
   * @param {string} id 
   * @param {Object} resumeJson 
   * @returns {Promise<Object>}
   */
  static async saveResumeJson(id, resumeJson) {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found.');
    }

    const currentProfile = user.profile || {};
    const updates = {
      resumeJson,
      resumeParsedAt: new Date().toISOString()
    };

    if (resumeJson.personalInfo) {
      if (!currentProfile.firstName && resumeJson.personalInfo.firstName) {
        updates.firstName = resumeJson.personalInfo.firstName;
      }
      if (!currentProfile.lastName && resumeJson.personalInfo.lastName) {
        updates.lastName = resumeJson.personalInfo.lastName;
      }
      if (!currentProfile.phone && resumeJson.personalInfo.phone) {
        updates.phone = resumeJson.personalInfo.phone;
      }
      if (!currentProfile.headline && resumeJson.personalInfo.summary) {
        updates.headline = resumeJson.personalInfo.summary.slice(0, 200);
      }
    }

    // Merge skills
    if (resumeJson.skills && Array.isArray(resumeJson.skills.all) && resumeJson.skills.all.length > 0) {
      const existing = Array.isArray(currentProfile.skills) ? currentProfile.skills : [];
      updates.skills = Array.from(new Set([...existing, ...resumeJson.skills.all]));
    }

    // Sync categories
    if (Array.isArray(resumeJson.workExperience) && resumeJson.workExperience.length > 0) {
      updates.workExperience = resumeJson.workExperience;
    }
    if (Array.isArray(resumeJson.education) && resumeJson.education.length > 0) {
      updates.education = resumeJson.education;
    }
    if (Array.isArray(resumeJson.projects) && resumeJson.projects.length > 0) {
      updates.projects = resumeJson.projects;
    }
    if (Array.isArray(resumeJson.extracurriculars) && resumeJson.extracurriculars.length > 0) {
      updates.extracurriculars = resumeJson.extracurriculars;
    }
    if (Array.isArray(resumeJson.volunteerExperience) && resumeJson.volunteerExperience.length > 0) {
      updates.volunteerExperience = resumeJson.volunteerExperience;
    }
    if (Array.isArray(resumeJson.certifications) && resumeJson.certifications.length > 0) {
      updates.certifications = resumeJson.certifications;
    }

    const updatedProfile = {
      ...currentProfile,
      ...updates
    };

    return this.updateUser(id, { profile: updatedProfile });
  }

  /**
   * Retrieve saved resume JSON from user profile
   * @param {string} id 
   * @returns {Promise<Object|null>}
   */
  static async getResumeJson(id) {
    const user = await this.findById(id);
    if (!user) return null;
    return user.profile?.resumeJson || null;
  }
}

module.exports = JobSeekerModel;
