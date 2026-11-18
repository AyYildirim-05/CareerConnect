
import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchConversations,
  startConversation,
  fetchMessages,
  sendMessage
} from '../services/messageService';

const POLL_MS = 5000;

const formatTime = (iso) => {
  if (!iso) return '';

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

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
  const [starting, setStarting] = useState(false);

  const bottomRef = useRef(null);
  const messageListRef = useRef(null);

  const loadConversations = useCallback(async () => {
    if (!token) return;

    try {
      const data = await fetchConversations(token);
      setConversations(data.conversations || []);
    } catch (err) {
      setError(
        err.error || err.message ||
        'Failed to load conversations.'
      );
    }
  }, [token]);

  useEffect(() => {
    if (!user || !token) return undefined;

    loadConversations();

    const timer = setInterval(
      loadConversations,
      POLL_MS
    );

    return () => clearInterval(timer);
  }, [user, token, loadConversations]);

  useEffect(() => {
    if (!activeId || !token) return undefined;

    let cancelled = false;
    let latest = null;

    setMessages([]);

    const load = async () => {
      try {
        const data = await fetchMessages(
          token,
          activeId,
          latest
        );

        const incoming = data.messages || [];

        if (cancelled || incoming.length === 0) return;

        latest = incoming[incoming.length - 1].createdAt;

        setMessages(prev => {
          const seen = new Set(prev.map(m => m.id));

          return [
            ...prev,
            ...incoming.filter(m => !seen.has(m.id))
          ];
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err.error || err.message ||
            'Failed to load messages.'
          );
        }
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
    if (!activeId) return;

    const container = messageListRef.current;

    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, activeId]);

  const handleSend = async (e) => {
    e.preventDefault();

    if (!draft.trim() || !activeId || sending) return;

    setSending(true);
    setError('');

    try {
      const { message } = await sendMessage(
        token,
        activeId,
        draft
      );

      setMessages(prev =>
        prev.some(m => m.id === message.id)
          ? prev
          : [...prev, message]
      );

      setDraft('');
      loadConversations();
    } catch (err) {
      setError(
        err.error || err.message ||
        'Failed to send message.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleStart = async (e) => {
    e.preventDefault();

    if (!newEmail.trim() || starting) return;

    setStarting(true);
    setError('');

    try {
      const { conversation } = await startConversation(
        token,
        newEmail.trim(),
        newMessage
      );

      setNewEmail('');
      setNewMessage('');

      await loadConversations();
      setActiveId(conversation.id);
    } catch (err) {
      setError(
        err.error || err.message ||
        'Failed to start conversation.'
      );
    } finally {
      setStarting(false);
    }
  };

  if (!user) return null;

  const active = conversations.find(
    c => c.id === activeId
  );

  return (
    <main className="cc-messages-page">
      <header className="cc-messages-page-header">
        <div>
          <h1>Messages</h1>
          <p>
            Connect and communicate with other
            CareerConnect users.
          </p>
        </div>
      </header>

      {error && (
        <div className="cc-messages-alert" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <div className="cc-messages-layout">
        <aside
          className="cc-messages-sidebar"
          aria-label="Conversations"
        >
          <div className="cc-messages-new">
            <h2>New conversation</h2>
            <p>Start a conversation with another user.</p>

            <form onSubmit={handleStart}>
              <label htmlFor="cc-recipient-email">
                Recipient email
              </label>

              <input
                id="cc-recipient-email"
                type="email"
                placeholder="name@example.com"
                value={newEmail}
                onChange={e =>
                  setNewEmail(e.target.value)
                }
                autoComplete="off"
                required
              />

              <label htmlFor="cc-first-message">
                First message
                <span className="cc-messages-optional">
                  {' '}(optional)
                </span>
              </label>

              <textarea
                id="cc-first-message"
                placeholder="Write your first message..."
                value={newMessage}
                onChange={e =>
                  setNewMessage(e.target.value)
                }
                maxLength={2000}
                rows={3}
              />

              <button
                className="cc-messages-primary-button"
                type="submit"
                disabled={starting}
              >
                {starting
                  ? 'Starting...'
                  : '+ Start conversation'}
              </button>
            </form>
          </div>

          <div className="cc-messages-list">
            <div className="cc-messages-list-header">
              <h2>Conversations</h2>
              <span>{conversations.length}</span>
            </div>

            {conversations.length === 0 ? (
              <div className="cc-messages-list-empty">
                No conversations yet.
              </div>
            ) : (
              conversations.map(c => {
                const selected = c.id === activeId;
                const unread = Number(c.unreadCount) || 0;

                return (
                  <button
                    key={c.id}
                    type="button"
                    className={
                      'cc-messages-conversation' +
                      (selected ? ' is-active' : '')
                    }
                    aria-pressed={selected}
                    onClick={() => {
                      setActiveId(c.id);
                      setError('');
                    }}
                  >
                    <span className="cc-messages-avatar">
                      {(c.otherUser?.email || '?')
                        .charAt(0)
                        .toUpperCase()}
                    </span>

                    <span className="cc-messages-conversation-info">
                      <span className="cc-messages-conversation-email">
                        {c.otherUser?.email || 'Unknown user'}
                      </span>

                      <span className="cc-messages-conversation-role">
                        {c.otherUser?.role || 'User'}
                      </span>

                      <span className="cc-messages-conversation-preview">
                        {c.lastMessage
                          ? c.lastMessage.body.slice(0, 60)
                          : 'No messages yet'}
                      </span>
                    </span>

                    {unread > 0 && (
                      <span
                        className="cc-messages-unread"
                        aria-label={`${unread} unread messages`}
                      >
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section
          className="cc-messages-thread"
          aria-label="Message thread"
        >
          {!active ? (
            <div className="cc-messages-placeholder">
              <div
                className="cc-messages-placeholder-icon"
                aria-hidden="true"
              >
                ✉
              </div>
              <h2>Your conversations</h2>
              <p>
                Select a conversation from the list,
                or start a new one to begin messaging.
              </p>
            </div>
          ) : (
            <>
              <div className="cc-messages-thread-header">
                <div className="cc-messages-avatar">
                  {(active.otherUser?.email || '?')
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="cc-messages-thread-user">
                  <h2>
                    {active.otherUser?.email || 'Unknown user'}
                  </h2>
                  <p>
                    {active.otherUser?.role || 'User'}
                  </p>
                </div>
              </div>

              <div
                ref={messageListRef}
                className="cc-messages-thread-body"
                role="log"
                aria-label="Conversation messages"
                aria-live="polite"
                aria-relevant="additions"
              >
                {messages.length === 0 && (
                  <p className="cc-messages-thread-empty">
                    No messages yet. Say hello!
                  </p>
                )}

                {messages.map(m => {
                  const mine =
                    String(m.senderId) === String(user.id);

                  return (
                    <div
                      key={m.id}
                      className={
                        'cc-messages-message-row' +
                        (mine ? ' is-mine' : '')
                      }
                    >
                      <div
                        className={
                          'cc-messages-bubble' +
                          (mine ? ' is-mine' : '')
                        }
                      >
                        {m.body}
                      </div>

                      <time
                        className="cc-messages-time"
                        dateTime={m.createdAt}
                      >
                        {formatTime(m.createdAt)}
                      </time>
                    </div>
                  );
                })}

                <div ref={bottomRef} />
              </div>

              <form
                className="cc-messages-composer"
                onSubmit={handleSend}
              >
                <input
                  aria-label="Type a message"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Type a message..."
                  maxLength={2000}
                />

                <button
                  type="submit"
                  className="cc-messages-primary-button"
                  disabled={sending || !draft.trim()}
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
