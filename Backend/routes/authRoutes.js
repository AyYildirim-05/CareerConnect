const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public authentication routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected user profile route
router.get('/me', authenticateToken, AuthController.getMe);

module.exports = router;
