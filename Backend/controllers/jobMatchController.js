const { JobPostingModel, JobSeekerModel } = require('../models');
const CompatibilityService = require('../services/compatibilityService');
const db = require('../config/db');

class JobMatchController {
  /**
   * Resolve candidate profile/resume data from request body or authenticated user's stored profile
   * @param {Object} req
   * @returns {Promise<{ resumeProfile: Object|null, resumeText: string, candidateSkills: string[] }>}
   */
  static async resolveCandidateData(req) {
    const body = req.body || {};
    let resumeProfile = null;
    let resumeText = typeof body.resumeText === 'string' ? body.resumeText : '';
    let candidateSkills = Array.isArray(body.skills) ? body.skills : [];

    if (body.resumeProfile) {
      resumeProfile = typeof body.resumeProfile === 'string'
        ? JSON.parse(body.resumeProfile)
        : body.resumeProfile;
    }

    if (!resumeProfile && !resumeText && candidateSkills.length === 0 && req.user && req.user.id) {
      const userId = String(req.user.id);

      // 1. Check saved parsed resumeJson on user profile
      const savedResumeJson = await JobSeekerModel.getResumeJson(userId);
      if (savedResumeJson && Object.keys(savedResumeJson).length > 0) {
        resumeProfile = savedResumeJson;
      }

      // 2. Check user.profile on users collection
      const userRecord = await JobSeekerModel.findById(userId);
      if (userRecord && userRecord.profile) {
        if (!resumeProfile) {
          resumeProfile = userRecord.profile;
        }
        if (Array.isArray(userRecord.profile.skills) && userRecord.profile.skills.length > 0) {
          candidateSkills = Array.from(new Set([...candidateSkills, ...userRecord.profile.skills]));
        }
      }

      // 3. Also check jobSeekers collection (for pre-seeded demo seekers)
      const firestore = db.getFirestore();
      if (firestore) {
        const seekerDoc = await firestore.collection('jobSeekers').doc(userId).get();
        if (seekerDoc.exists) {
          const seekerData = seekerDoc.data() || {};
          if (!resumeProfile) {
            resumeProfile = seekerData;
          }
          if (Array.isArray(seekerData.skills) && seekerData.skills.length > 0) {
            candidateSkills = Array.from(new Set([...candidateSkills, ...seekerData.skills]));
          }
          if (!resumeText && seekerData.bio) {
            resumeText = seekerData.bio;
          }
        }
      }
    }

    return {
      resumeProfile,
      resumeText,
      candidateSkills
    };
  }

  /**
   * GET or POST /api/jobs/:id/match
   * Calculates 0-100% compatibility score and 2-3 bullet skill gap analysis for a job posting (Task 9.2)
   */
  static async getMatchAnalysis(req, res) {
    try {
      const job = await JobPostingModel.findById(req.params.id);
      const isOwner = job && req.user && job.recruiterId === String(req.user.id);

      if (!job || (job.status !== JobPostingModel.STATUS_PUBLISHED && !isOwner)) {
        return res.status(404).json({
          success: false,
          error: 'Job posting not found.'
        });
      }

      const { resumeProfile, resumeText, candidateSkills } = await JobMatchController.resolveCandidateData(req);

      const useLlm = req.query.mode !== 'local' && (!req.body || req.body.useLlm !== false);

      const match = await CompatibilityService.analyzeCompatibility({
        resumeProfile,
        resumeText,
        candidateSkills,
        job,
        useLlm
      });

      return res.status(200).json({
        success: true,
        match
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to calculate job compatibility match.'
      });
    }
  }
}

module.exports = JobMatchController;
