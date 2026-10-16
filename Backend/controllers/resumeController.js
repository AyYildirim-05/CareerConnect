const ResumeParserService = require('../services/resumeParserService');
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

    await JobSeekerModel.saveResumeJson(req.user.id, resumeJson);

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

module.exports = {
  uploadResume,
  uploadResumeJson,
  getResumeProfile,
  downloadResumeJson
};