import apiRequest from './apiRequest';

/**
 * Fetch the AI compatibility match score and 2-3 bullet gap analysis for a job posting
 * @param {string} jobId
 * @param {string} token
 * @returns {Promise<{ success: boolean, match: { jobId: string, jobTitle: string, provider: string, matchScore: number, matchedSkills: string[], missingSkills: string[], summaryBullets: string[] } }>}
 */
export function fetchJobMatch(jobId, token) {
  return apiRequest(`/jobs/${jobId}/match`, token, { method: 'GET' });
}

/**
 * Calculate compatibility match against an explicit custom profile/resume payload
 * @param {string} jobId
 * @param {Object} payload - { resumeProfile, resumeText, skills, useLlm }
 * @param {string} token
 */
export function analyzeCustomJobMatch(jobId, payload, token) {
  return apiRequest(`/jobs/${jobId}/match`, token, {
    method: 'POST',
    body: payload
  });
}
