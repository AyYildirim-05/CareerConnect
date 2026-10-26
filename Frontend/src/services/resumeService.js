const API_URL = 'http://localhost:5500/api/resumes';

/**
 * Upload and parse a PDF resume
 * @param {File} file 
 * @param {string} [token] 
 * @returns {Promise<Object>}
 */
export const uploadResume = async (file, token = null) => {
  const formData = new FormData();
  formData.append('resume', file);

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to upload and parse resume.');
  }

  return data;
};

/**
 * Fetch saved parsed resume JSON profile from Firestore
 * @param {string} token 
 * @returns {Promise<Object>}
 */
export const fetchResumeProfile = async (token) => {
  const response = await fetch(`${API_URL}/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch resume profile.');
  }
  return data;
};

/**
 * Update authenticated user's resume JSON profile directly in Firebase
 * @param {Object} updatedJson 
 * @param {string} token 
 * @returns {Promise<Object>}
 */
export const updateResumeProfile = async (updatedJson, token) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updatedJson),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update resume profile in Firebase.');
  }
  return data;
};

/**
 * Upload a JSON format resume profile directly to the backend
 * @param {Object} jsonData 
 * @param {string} token 
 * @returns {Promise<Object>}
 */
export const uploadJsonProfile = async (jsonData, token) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/upload-json`, {
    method: 'POST',
    headers,
    body: JSON.stringify(jsonData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to upload JSON resume profile.');
  }
  return data;
};

/**
 * Request GenAI feedback (Strengths, Missing Keywords, Actionable Revisions)
 * against a target role using either an uploaded PDF file, a resume JSON profile, or saved profile.
 * @param {Object} params
 * @param {string} params.targetRole
 * @param {File} [params.file]
 * @param {Object} [params.resumeProfile]
 * @param {string} [params.token]
 * @returns {Promise<Object>}
 */
export const requestResumeFeedback = async ({ targetRole, file = null, resumeProfile = null, token = null }) => {
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let body;
  if (file) {
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('targetRole', targetRole);
    body = formData;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({
      targetRole,
      ...(resumeProfile ? { resumeProfile } : {})
    });
  }

  const response = await fetch(`${API_URL}/feedback`, {
    method: 'POST',
    headers,
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to generate AI resume feedback.');
  }

  return data;
};

/**
 * Download a JavaScript object as a .json file directly in the browser
 * @param {Object} data 
 * @param {string} [filename] 
 */
export const exportJsonFile = (data, filename = 'careerconnect_profile.json') => {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(data, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};