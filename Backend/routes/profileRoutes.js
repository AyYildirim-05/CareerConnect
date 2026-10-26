
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

router.use(authenticateToken);
router.use(authorizeRoles('Job Seeker'));

router.get('/', getProfile);
router.put('/', updateProfile);

module.exports = router;
