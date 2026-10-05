const express = require('express');
const router = express.Router();
const JobController = require('../controllers/jobController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// All job routes require a logged-in user
router.use(authenticateToken);

// Any logged-in user: browse active (published) job listings
router.get('/', JobController.listPublished);

// Recruiter only: own postings, including drafts
// (must be declared before '/:id' so "mine" isn't treated as an id)
router.get('/mine', authorizeRoles('Recruiter'), JobController.listMine);

router.get('/:id', JobController.getById);

// Recruiter only: create, edit, publish
router.post('/', authorizeRoles('Recruiter'), JobController.create);
router.put('/:id', authorizeRoles('Recruiter'), JobController.update);
router.patch('/:id/publish', authorizeRoles('Recruiter'), JobController.publish);

module.exports = router;
