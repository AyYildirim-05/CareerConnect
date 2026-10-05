const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5500/api';

/**
 * Shared helper: send an authenticated request to /api/jobs and return the JSON body
 * @param {string} path - Path after /jobs (e.g. '', '/mine', '/abc123/publish')
 * @param {string} token - JWT from AuthContext
 * @param {Object} [options] - { method, body }
 */
async function jobRequest(path, token, { method = 'GET', body } = {}) {
  const headers = { 'Authorization': `Bearer ${token}` };
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}/jobs${path}`, {
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

/**
 * Fetch active (published) job listings
 * @param {string} token
 */
export function fetchPublishedJobs(token) {
  return jobRequest('', token);
}

/**
 * Fetch the logged-in recruiter's postings, drafts included
 * @param {string} token
 */
export function fetchMyJobs(token) {
  return jobRequest('/mine', token);
}

/**
 * Fetch a single job posting
 * @param {string} id
 * @param {string} token
 */
export function fetchJob(id, token) {
  return jobRequest(`/${id}`, token);
}

/**
 * Create a job posting
 * @param {Object} jobData - { title, description, department, location, jobType, workMode, requirements, publish }
 * @param {string} token
 */
export function createJob(jobData, token) {
  return jobRequest('', token, { method: 'POST', body: jobData });
}

/**
 * Edit an existing job posting
 * @param {string} id
 * @param {Object} jobData
 * @param {string} token
 */
export function updateJob(id, jobData, token) {
  return jobRequest(`/${id}`, token, { method: 'PUT', body: jobData });
}

/**
 * Publish a draft job posting
 * @param {string} id
 * @param {string} token
 */
export function publishJob(id, token) {
  return jobRequest(`/${id}/publish`, token, { method: 'PATCH' });
}
