const ResumeParserService = require('../services/resumeParserService');
const ResumeFeedbackService = require('../services/resumeFeedbackService');
const { JobSeekerModel } = require('../models');

/**
 * Upload and parse PDF resume
 * Extracts personal info, work experience, education, projects, skills,
 * extracurriculars, volunteer experience, certifications, and updates user profile in Firebase.
 */
const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No PDF resume was uploaded.'
      });
    }

    // 1. Parse PDF buffer into structured JSON categories
    const parsedProfile = await ResumeParserService.parsePdf(req.file.buffer, {
      originalFilename: req.file.originalname,
      fileSize: req.file.size
    });

    let savedToProfile = false;
    let updatedUser = null;

    // 2. If user is authenticated, update their Firestore user profile
    if (req.user && req.user.id) {
      try {
        updatedUser = await JobSeekerModel.saveResumeJson(req.user.id, parsedProfile);
        savedToProfile = true;
      } catch (dbErr) {
        console.error('Failed to save parsed resume to Firestore profile:', dbErr);
        // Continue to return parsed profile even if db update encountered an issue
      }
    }

    return res.status(201).json({
      success: true,
      message: savedToProfile
        ? 'Resume uploaded, parsed, and saved to your profile in Firebase!'
        : 'Resume uploaded and parsed successfully.',
      savedToProfile,
      parsedProfile,
      file: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Resume upload/parsing error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to process and parse resume.',
      error: error.message
    });
  }
};

/**
 * Get current authenticated user's parsed resume JSON
 */
const getResumeProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const resumeJson = await JobSeekerModel.getResumeJson(req.user.id);
    if (!resumeJson) {
      return res.status(404).json({
        success: false,
        message: 'No parsed resume profile found. Please upload a resume first.'
      });
    }

    return res.status(200).json({
      success: true,
      resumeJson
    });
  } catch (error) {
    console.error('Error fetching resume profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch resume profile.'
    });
  }
};

/**
 * Download user's parsed resume profile as a .json file
 */
const downloadResumeJson = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const resumeJson = await JobSeekerModel.getResumeJson(req.user.id);
    if (!resumeJson) {
      return res.status(404).json({
        success: false,
        message: 'No resume profile available to download.'
      });
    }

    const filename = `careerconnect_profile_${req.user.id}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(JSON.stringify(resumeJson, null, 2));
  } catch (error) {
    console.error('Error downloading resume JSON:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to download resume JSON.'
    });
  }
};

/**
 * Upload an existing JSON format resume profile directly into Firebase
 */
const uploadResumeJson = async (req, res) => {
  try {
    const resumeJson = req.body;
    if (!resumeJson || typeof resumeJson !== 'object' || Object.keys(resumeJson).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON payload. Please upload a valid JSON profile.'
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'You must be logged in to save your resume JSON profile.'
      });
    }

    await JobSeekerModel.saveResumeJson(req.user.id, resumeJson, { isUpdate: true });

    return res.status(200).json({
      success: true,
      message: 'JSON resume profile uploaded and synced to your Firebase account!',
      savedToProfile: true,
      parsedProfile: resumeJson
    });
  } catch (error) {
    console.error('Error uploading JSON resume profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save JSON resume profile.',
      error: error.message
    });
  }
};

/**
 * Update authenticated user's resume JSON profile directly in Firebase
 * Allows full manual modifications (adding, updating, removing fields)
 */
const updateResumeProfile = async (req, res) => {
  try {
    const resumeJson = req.body;
    if (!resumeJson || typeof resumeJson !== 'object' || Object.keys(resumeJson).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resume data. Please provide a valid profile JSON object.'
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'You must be logged in to update your resume profile.'
      });
    }

    const updatedUser = await JobSeekerModel.saveResumeJson(req.user.id, resumeJson, { isUpdate: true });

    return res.status(200).json({
      success: true,
      message: 'Resume profile and JSON successfully updated and synced in Firebase!',
      savedToProfile: true,
      resumeJson,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating resume JSON in Firebase:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update resume profile in Firebase.',
      error: error.message
    });
  }
};

/**
 * Generate GenAI resume feedback (Strengths, Missing Keywords, Actionable Revisions)
 * against a target job role. Supports an uploaded PDF, explicit resumeText/resumeProfile,
 * or falls back to the authenticated user's saved Firestore resume profile.
 */
const analyzeResumeFeedback = async (req, res) => {
  try {
    const targetRole = req.body && req.body.targetRole;
    let resumeText = (req.body && req.body.resumeText) || '';

    // 1. If a PDF file was uploaded directly, extract its text
    if (req.file && req.file.buffer) {
      const extracted = await ResumeParserService.extractRawText(req.file.buffer);
      resumeText = extracted.rawText;
    } else if (!resumeText && req.body && req.body.resumeProfile) {
      // 2. If a structured resumeProfile object was provided in body
      const profileObj = typeof req.body.resumeProfile === 'string'
        ? JSON.parse(req.body.resumeProfile)
        : req.body.resumeProfile;
      resumeText = ResumeParserService.profileToText(profileObj);
    } else if (!resumeText && req.user && req.user.id) {
      // 3. Otherwise load the authenticated user's saved resume profile from Firestore
      const savedProfile = await JobSeekerModel.getResumeJson(req.user.id);
      if (savedProfile && Object.keys(savedProfile).length > 0) {
        resumeText = ResumeParserService.profileToText(savedProfile);
      }
      if (!resumeText) {
        const userRecord = await JobSeekerModel.findById(req.user.id);
        if (userRecord && userRecord.profile) {
          resumeText = ResumeParserService.profileToText(userRecord.profile);
        }
      }
    }

    const clientKey = (req.user && req.user.id) || req.ip || 'anonymous';

    const feedback = await ResumeFeedbackService.analyzeResume({
      resumeText,
      targetRole,
      clientKey
    });

    return res.status(200).json({
      success: true,
      message: 'AI resume feedback generated successfully.',
      feedback
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to generate AI resume feedback.'
    });
  }
};

module.exports = {
  uploadResume,
  uploadResumeJson,
  getResumeProfile,
  updateResumeProfile,
  downloadResumeJson,
  analyzeResumeFeedback
};