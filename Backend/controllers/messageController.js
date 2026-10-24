const { UserModel, ConversationModel, MessageModel } = require('../models');

const MAX_MESSAGE_LENGTH = 2000;

function validateBody(body) {
  if (typeof body !== 'string' || !body.trim()) return 'Message cannot be empty.';
  if (body.trim().length > MAX_MESSAGE_LENGTH) {
    return `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`;
  }
  return null;
}

/** Load a conversation and make sure the caller is a participant. */
async function loadAuthorizedConversation(req, res) {
  const conversation = await ConversationModel.findById(req.params.id);
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found.' });
    return null;
  }
  if (!conversation.participantIds.includes(req.user.id)) {
    res.status(403).json({ error: 'You are not a participant in this conversation.' });
    return null;
  }
  return conversation;
}

/** Shape a conversation for the client from the caller's point of view. */
function toClientConversation(conversation, userId) {
  const otherId = conversation.participantIds.find((id) => id !== userId);
  return {
    id: conversation.id,
    otherUser: { id: otherId, ...(conversation.participants[otherId] || {}) },
    lastMessage: conversation.lastMessage,
    lastMessageAt: conversation.lastMessageAt,
    unreadCount: (conversation.unreadCounts && conversation.unreadCounts[userId]) || 0,
    createdAt: conversation.created_at
  };
}

class MessageController {
  /** GET /api/conversations */
  static async listConversations(req, res) {
    try {
      const conversations = await ConversationModel.listForUser(req.user.id);
      return res.status(200).json({
        conversations: conversations.map((c) => toClientConversation(c, req.user.id))
      });
    } catch (error) {
      console.error('List conversations error:', error);
      return res.status(500).json({ error: 'Failed to load conversations.' });
    }
  }

  /**
   * POST /api/conversations
   * Body: { recipientEmail, message? }
   * Starts a thread (or returns the existing one) and optionally sends the first message.
   */
  static async startConversation(req, res) {
    try {
      const { recipientEmail, message } = req.body;

      if (!recipientEmail || !recipientEmail.trim()) {
        return res.status(400).json({ error: 'Recipient email is required.' });
      }
      if (message !== undefined && message !== '') {
        const msgError = validateBody(message);
        if (msgError) return res.status(400).json({ error: msgError });
      }

      const sender = await UserModel.findById(req.user.id);
      const recipient = await UserModel.findByEmail(recipientEmail);
      if (!sender) return res.status(404).json({ error: 'Your account was not found.' });
      if (!recipient) return res.status(404).json({ error: 'No user found with that email.' });
      if (recipient.id === sender.id) {
        return res.status(400).json({ error: 'You cannot message yourself.' });
      }

      // TODO (once the Applications feature exists): when sender.role === 'Recruiter',
      // verify the recipient has applied to one of the recruiter's postings.

      let conversation = await ConversationModel.findBetween(sender.id, recipient.id);
      const created = !conversation;
      if (!conversation) {
        conversation = await ConversationModel.create(sender, recipient);
      }

      if (message && message.trim()) {
        const saved = await MessageModel.create(conversation.id, {
          senderId: sender.id,
          body: message.trim()
        });
        await ConversationModel.recordMessage(conversation, saved);
        conversation = await ConversationModel.findById(conversation.id);
      }

      return res.status(created ? 201 : 200).json({
        conversation: toClientConversation(conversation, sender.id)
      });
    } catch (error) {
      console.error('Start conversation error:', error);
      return res.status(500).json({ error: 'Failed to start conversation.' });
    }
  }

  /** GET /api/conversations/:id/messages?after=<ISO timestamp> */
  static async getMessages(req, res) {
    try {
      const conversation = await loadAuthorizedConversation(req, res);
      if (!conversation) return;

      const messages = await MessageModel.list(conversation.id, { after: req.query.after });
      await ConversationModel.markRead(conversation.id, req.user.id);

      return res.status(200).json({ messages });
    } catch (error) {
      console.error('Get messages error:', error);
      return res.status(500).json({ error: 'Failed to load messages.' });
    }
  }

  /** POST /api/conversations/:id/messages  Body: { body } */
  static async sendMessage(req, res) {
    try {
      const conversation = await loadAuthorizedConversation(req, res);
      if (!conversation) return;

      const error = validateBody(req.body.body);
      if (error) return res.status(400).json({ error });

      const message = await MessageModel.create(conversation.id, {
        senderId: req.user.id,
        body: req.body.body.trim()
      });
      await ConversationModel.recordMessage(conversation, message);

      return res.status(201).json({ message });
    } catch (error) {
      console.error('Send message error:', error);
      return res.status(500).json({ error: 'Failed to send message.' });
    }
  }
}

module.exports = MessageController;
