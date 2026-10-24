import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchConversations,
  startConversation,
  fetchMessages,
  sendMessage
} from '../services/messageService';

const POLL_MS = 5000;

const formatTime = (iso) =>
  new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

export default function Messages() {
  const { user, token } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchConversations(token);
      setConversations(data.conversations);
    } catch (err) {
      setError(err.error || 'Failed to load conversations.');
    }
  }, [token]);

  // Load thread list + poll
  useEffect(() => {
    loadConversations();
    const timer = setInterval(loadConversations, POLL_MS);
    return () => clearInterval(timer);
  }, [loadConversations]);

  // Load full history when a thread is opened, then poll only for newer messages
  useEffect(() => {
    if (!activeId) return undefined;
    let cancelled = false;
    let latest = null;
    setMessages([]);

    const load = async () => {
      try {
        const data = await fetchMessages(token, activeId, latest);
        if (cancelled || data.messages.length === 0) return;
        latest = data.messages[data.messages.length - 1].createdAt;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...data.messages.filter((m) => !seen.has(m.id))];
        });
      } catch (err) {
        if (!cancelled) setError(err.error || 'Failed to load messages.');
      }
    };

    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !activeId) return;
    setSending(true);
    setError('');
    try {
      const { message } = await sendMessage(token, activeId, draft);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      setDraft('');
      loadConversations();
    } catch (err) {
      setError(err.error || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleStart = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { conversation } = await startConversation(token, newEmail, newMessage);
      setNewEmail('');
      setNewMessage('');
      await loadConversations();
      setActiveId(conversation.id);
    } catch (err) {
      setError(err.error || 'Failed to start conversation.');
    }
  };

  if (!user) return null;
  const active = conversations.find((c) => c.id === activeId);

  return (
    <div>
      <h2>Messages</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '1rem' }}>
        {/* Conversation list + new thread form */}
        <aside style={{ width: 280 }}>
          <form onSubmit={handleStart}>
            <strong>New conversation</strong>
            <br />
            <input
              type="email"
              placeholder="Recipient email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
            <br />
            <textarea
              placeholder="First message (optional)"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              maxLength={2000}
            />
            <br />
            <button type="submit">Start</button>
          </form>
          <hr />
          {conversations.length === 0 && <p>No conversations yet.</p>}
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => setActiveId(c.id)}
              style={{
                cursor: 'pointer',
                padding: '0.5rem',
                background: c.id === activeId ? '#e8f0fe' : 'transparent'
              }}
            >
              <strong>{c.otherUser.email}</strong> ({c.otherUser.role})
              {c.unreadCount > 0 && <span> • {c.unreadCount} new</span>}
              <br />
              <small>{c.lastMessage ? c.lastMessage.body.slice(0, 40) : 'No messages yet'}</small>
            </div>
          ))}
        </aside>

        {/* Thread */}
        <section style={{ flex: 1 }}>
          {!active ? (
            <p>Select a conversation or start a new one.</p>
          ) : (
            <>
              <h3>{active.otherUser.email}</h3>
              <div
                style={{
                  height: 360,
                  overflowY: 'auto',
                  border: '1px solid #ccc',
                  padding: '0.5rem'
                }}
              >
                {messages.map((m) => {
                  const mine = m.senderId === user.id;
                  return (
                    <div key={m.id} style={{ textAlign: mine ? 'right' : 'left', margin: '0.5rem 0' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          maxWidth: '70%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 12,
                          background: mine ? '#1a73e8' : '#eee',
                          color: mine ? '#fff' : '#000',
                          whiteSpace: 'pre-wrap',
                          textAlign: 'left'
                        }}
                      >
                        {m.body}
                      </span>
                      <br />
                      <small>{formatTime(m.createdAt)}</small>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  style={{ flex: 1 }}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message..."
                  maxLength={2000}
                />
                <button type="submit" disabled={sending || !draft.trim()}>
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
