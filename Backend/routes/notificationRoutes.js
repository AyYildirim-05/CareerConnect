const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', NotificationController.list);
router.patch('/:id/read', NotificationController.markRead);

module.exports = router;