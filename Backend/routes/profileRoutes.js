
const express = require('express');
const router = express.Router();

const {
  authenticateToken,
  authorizeRoles
} = require('../middleware/authMiddleware');

const {
  getProfile,
  updateProfile
} = require('../controllers/profileController');

const upload = require('../middleware/uploadMiddleware');

const {
  uploadProfileResume,
  previewProfileResume,
  deleteProfileResume
} = require('../controllers/profileResumeController');

router.use(authenticateToken);
router.use(authorizeRoles('Job Seeker'));

// Existing profile routes - unchanged.
router.get('/', getProfile);
router.put('/', updateProfile);

// PDF resume management.
router.post('/resume', upload.single('resume'), uploadProfileResume);
router.get('/resume', previewProfileResume);
router.delete('/resume', deleteProfileResume);

module.exports = router;
