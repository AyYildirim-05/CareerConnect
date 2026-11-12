import apiRequest from './apiRequest';

/**
 * Start or resume an automated mock interview session for a specific job posting (Tasks 11.1 & 11.2)
 * @param {string} jobId
 * @param {string} token
 * @param {Object} [options={}] - Optional { forceNew: boolean }
 * @returns {Promise<{ success: boolean, resumed: boolean, interview: Object }>}
 */
export function startMockInterview(jobId, token, options = {}) {
  return apiRequest(`/mock-interviews/job/${jobId}/start`, token, {
    method: 'POST',
    body: options
  });
}

/**
 * Save or update the user's sequential responses in the mock interview transcript (Tasks 11.2 & 11.3)
 * @param {string} interviewId
 * @param {Object} payload - { singleAnswer?: { questionNumber, response, responseMode }, transcript?: Array, status?: string }
 * @param {string} token
 * @returns {Promise<{ success: boolean, interview: Object }>}
 */
export function saveMockInterviewTranscript(interviewId, payload, token) {
  return apiRequest(`/mock-interviews/${interviewId}`, token, {
    method: 'PUT',
    body: payload
  });
}

/**
 * Fetch previous mock interview sessions for a job posting
 * @param {string} jobId
 * @param {string} token
 * @returns {Promise<{ success: boolean, interviews: Array<Object> }>}
 */
export function fetchMockInterviewsByJob(jobId, token) {
  return apiRequest(`/mock-interviews/job/${jobId}`, token, {
    method: 'GET'
  });
}
