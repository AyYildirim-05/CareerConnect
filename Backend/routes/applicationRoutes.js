const express = require('express');
const router = express.Router();
const ApplicationController = require('../controllers/applicationController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// All application routes require authentication
router.use(authenticateToken);

// Job Seeker endpoints
router.post('/', authorizeRoles('Job Seeker'), ApplicationController.submit);
router.get('/mine', authorizeRoles('Job Seeker'), ApplicationController.listMine);
router.get('/stats', authorizeRoles('Job Seeker'), ApplicationController.getStats);
router.get('/:id/job-details', authorizeRoles('Job Seeker'), ApplicationController.getArchivedJobDetails);

// Recruiter pipeline endpoints
router.patch('/:id/status', authorizeRoles('Recruiter'), ApplicationController.updateStatus);
router.get('/job/:jobId', authorizeRoles('Recruiter'), ApplicationController.listByJob);

module.exports = router;

