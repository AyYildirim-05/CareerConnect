const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5500/api';

/**
 * Shared helper: send an authenticated request to the backend and return the JSON body
 * @param {string} path - Path after /api (e.g. '/jobs', '/companies/me')
 * @param {string} token - JWT from AuthContext
 * @param {Object} [options] - { method, body }
 */
export default async function apiRequest(path, token, { method = 'GET', body } = {}) {
  const headers = { 'Authorization': `Bearer ${token}` };
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json();
  if (!response.ok) {
    throw data;
  }
  return data;
}
