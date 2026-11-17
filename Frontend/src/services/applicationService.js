const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5500/api';

function getAuthHeaders(token) {
  const authToken = token || localStorage.getItem('token');
  if (!authToken) {
    throw new Error('Authentication token required.');
  }

  return {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
}

// Submit application for a job
export async function submitApplication(token, jobId) {
  const response = await fetch(`${API_BASE_URL}/applications`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ jobId })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to submit application.');
  }

  return data;
}

// Get current user's submitted applications
export async function fetchMyApplications(token) {
  const response = await fetch(`${API_BASE_URL}/applications/mine`, {
    method: 'GET',
    headers: getAuthHeaders(token)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to fetch your applications.');
  }

  return data;
}

// Update applicant status (Applied, Interview, Offered, Rejected)
export async function updateApplicationStatus(token, applicationId, status) {
  const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ status })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to update application status.');
  }

  return data;
}

// Get applicants for a job posting
export async function fetchJobApplicants(token, jobId) {
  const response = await fetch(`${API_BASE_URL}/applications/job/${jobId}`, {
    method: 'GET',
    headers: getAuthHeaders(token)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to fetch applicants.');
  }

  return data;
}

// Get application analytics & conversion metrics (Task 13.1)
export async function fetchApplicationStats(token, { startDate = '', endDate = '' } = {}) {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE_URL}/applications/stats${queryString}`, {
    method: 'GET',
    headers: getAuthHeaders(token)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to fetch application analytics.');
  }

  return data;
}

// Get archived job posting details for a past application
export async function fetchArchivedJobDetails(applicationId, token) {
  const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/job-details`, {
    method: 'GET',
    headers: getAuthHeaders(token)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to fetch posting details.');
  }

  return data;
}
