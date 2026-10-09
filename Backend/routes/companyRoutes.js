const express = require('express');
const router = express.Router();
const CompanyController = require('../controllers/companyController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// All company routes require a logged-in user
router.use(authenticateToken);

// Any logged-in user: browse company pages
router.get('/', CompanyController.list);

// Recruiter only: set up, view and edit own company
// (must be declared before '/:id' so "mine" isn't treated as an id)
router.get('/mine', authorizeRoles('Recruiter'), CompanyController.getMine);
router.put('/mine', authorizeRoles('Recruiter'), CompanyController.updateMine);
router.post('/', authorizeRoles('Recruiter'), CompanyController.create);

router.post('/:id/join', authorizeRoles('Recruiter'), CompanyController.join);
router.get('/:id', CompanyController.getById);

module.exports = router;
