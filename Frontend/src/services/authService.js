const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5500/api';

/**
 * Register a new user
 * @param {Object} userData - { email, password, role }
 */
export async function registerUser({ email, password, role }) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password, role })
  });

  const data = await response.json();
  if (!response.ok) {
    throw data;
  }
  return data;
}

/**
 * Log in an existing user
 * @param {Object} credentials - { email, password }
 */
export async function loginUser({ email, password }) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  if (!response.ok) {
    throw data;
  }
  return data;
}

/**
 * Fetch authenticated user profile
 * @param {string} token 
 */
export async function fetchMe(token) {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw data;
  }
  return data;
}
