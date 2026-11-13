const express = require('express');
const router = express.Router();
const MockInterviewController = require('../controllers/mockInterviewController');
const { authenticateToken } = require('../middleware/authMiddleware');
const EvalController = require('../controllers/mockInterviewEvaluationController');

// All mock interview routes require authentication
router.use(authenticateToken);

// Evaluation routes
router.get('/evaluations/saved', EvalController.listSaved);
router.post('/:interviewId/evaluate', EvalController.evaluate);
router.patch('/:interviewId/evaluation/save', EvalController.setSaved);

// Start or resume an automated mock interview session for a specific job posting
router.post('/job/:jobId/start', MockInterviewController.startInterview);

// Fetch previous mock interview sessions for a specific job posting
router.get('/job/:jobId', MockInterviewController.listByJob);

// Fetch a specific mock interview session by ID
router.get('/:interviewId', MockInterviewController.getSessionById);

// Save/update sequential responses (transcript) for a mock interview session
router.put('/:interviewId', MockInterviewController.saveTranscript);



module.exports = router;
