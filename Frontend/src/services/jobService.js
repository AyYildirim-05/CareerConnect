import apiRequest from './apiRequest';

/**
 * Fetch active (published) job listings with optional search and filters
 * @param {string} token
 * @param {Object} [filters={}] - { keyword, location, type, workMode }
 */
export function fetchPublishedJobs(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.keyword && filters.keyword.trim()) {
    params.append('keyword', filters.keyword.trim());
  }
  if (filters.location && filters.location.trim()) {
    params.append('location', filters.location.trim());
  }
  if (filters.type && filters.type.trim()) {
    params.append('type', filters.type.trim());
  }
  if (filters.workMode && filters.workMode.trim()) {
    params.append('workMode', filters.workMode.trim());
  }
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/jobs${queryString}`, token);
}

/**
 * Fetch the logged-in recruiter's postings, drafts included
 * @param {string} token
 */
export function fetchMyJobs(token) {
  return apiRequest('/jobs/mine', token);
}

/**
 * Fetch a single job posting
 * @param {string} id
 * @param {string} token
 */
export function fetchJob(id, token) {
  return apiRequest(`/jobs/${id}`, token);
}

/**
 * Create a job posting
 * @param {Object} jobData - { title, description, department, location, jobType, workMode, requirements, publish }
 * @param {string} token
 */
export function createJob(jobData, token) {
  return apiRequest('/jobs', token, { method: 'POST', body: jobData });
}

/**
 * Edit an existing job posting
 * @param {string} id
 * @param {Object} jobData
 * @param {string} token
 */
export function updateJob(id, jobData, token) {
  return apiRequest(`/jobs/${id}`, token, { method: 'PUT', body: jobData });
}

/**
 * Publish a draft job posting
 * @param {string} id
 * @param {string} token
 */
export function publishJob(id, token) {
  return apiRequest(`/jobs/${id}/publish`, token, { method: 'PATCH' });
}

/**
 * Permanently delete a job posting
 * @param {string} id
 * @param {string} token
 */
export function deleteJob(id, token) {
  return apiRequest(`/jobs/${id}`, token, { method: 'DELETE' });
  
}

/**
 * Bookmark a job to the logged-in user's saved list
 * @param {string} id
 * @param {string} token
 */
export function saveJob(id, token) {
  return apiRequest(`/jobs/${id}/save`, token, { method: 'POST' });
}

/**
 * Remove a job from the saved list
 * @param {string} id
 * @param {string} token
 */
export function unsaveJob(id, token) {
  return apiRequest(`/jobs/${id}/save`, token, { method: 'DELETE' });
}

/**
 * Fetch the logged-in user's saved jobs
 * @param {string} token
 */
export function fetchSavedJobs(token) {
  return apiRequest('/jobs/saved', token);
}
