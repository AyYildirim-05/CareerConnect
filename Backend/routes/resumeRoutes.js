const express = require('express');
const router = express.Router();

const upload = require('../middleware/uploadMiddleware');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/authMiddleware');
const {
  uploadResume,
  uploadResumeJson,
  getResumeProfile,
  updateResumeProfile,
  downloadResumeJson
} = require('../controllers/resumeController');

// POST /api/resumes/upload
// Accepts multipart/form-data with 'resume' PDF file, parses into JSON and updates Firestore profile
router.post('/upload', optionalAuthenticateToken, upload.single('resume'), uploadResume);

// POST /api/resumes/upload-json
// Accepts JSON resume profile directly and syncs to authenticated user's Firestore profile
router.post('/upload-json', authenticateToken, uploadResumeJson);

// GET /api/resumes/profile
// Retrieves authenticated user's parsed JSON resume profile
router.get('/profile', authenticateToken, getResumeProfile);

// PUT /api/resumes/profile
// Updates authenticated user's resume JSON profile directly in Firestore
router.put('/profile', authenticateToken, updateResumeProfile);

// GET /api/resumes/download
// Downloads authenticated user's resume profile as a JSON file
router.get('/download', authenticateToken, downloadResumeJson);

module.exports = router;