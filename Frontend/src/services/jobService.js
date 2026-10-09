import apiRequest from './apiRequest';

/**
 * Fetch active (published) job listings
 * @param {string} token
 */
export function fetchPublishedJobs(token) {
  return apiRequest('/jobs', token);
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
