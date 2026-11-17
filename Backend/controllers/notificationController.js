const NotificationModel = require('../models/notificationModel');

class NotificationController {
  static async list(req, res) {
    try {
      const notifications = await NotificationModel.findByUser(req.user.id);
      return res.status(200).json({ notifications });
    } catch (error) {
      console.error('Fetch notifications error:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
  }

  static async markRead(req, res) {
    try {
      const updated = await NotificationModel.markAsRead(req.params.id, req.user.id);
      if (!updated) {
        return res.status(404).json({ error: 'Notification not found.' });
      }
      return res.status(200).json({ message: 'Notification marked as read.', notification: updated });
    } catch (error) {
      console.error('Mark notification read error:', error);
      return res.status(500).json({ error: 'Failed to update notification.' });
    }
  }

  static async clearAll(req, res) {
    try {
      await NotificationModel.clearAllForUser(req.user.id);
      return res.status(200).json({ message: 'All notifications cleared.' });
    } catch (error) {
      console.error('Clear all notifications error:', error);
      return res.status(500).json({ error: 'Failed to clear notifications.' });
    }
  }
}

module.exports = NotificationController;