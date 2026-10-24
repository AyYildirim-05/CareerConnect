const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5500/api';

async function request(path, token, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  });
  const data = await response.json();
  if (!response.ok) throw data;
  return data;
}

export const fetchConversations = (token) => request('/conversations', token);

export const startConversation = (token, recipientEmail, message) =>
  request('/conversations', token, {
    method: 'POST',
    body: JSON.stringify({ recipientEmail, message })
  });

export const fetchMessages = (token, conversationId, after) =>
  request(
    `/conversations/${conversationId}/messages${after ? `?after=${encodeURIComponent(after)}` : ''}`,
    token
  );

export const sendMessage = (token, conversationId, body) =>
  request(`/conversations/${conversationId}/messages`, token, {
    method: 'POST',
    body: JSON.stringify({ body })
  });
