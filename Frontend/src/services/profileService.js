
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5500/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('Please log in to access your profile.');
  }

  return {
    Authorization: `Bearer ${token}`
  };
}

// GET /api/profile
export async function getProfile() {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || data.message || 'Failed to load profile'
    );
  }

  return data;
}

// PUT /api/profile
export async function updateProfile(profileData) {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(profileData)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || data.message || 'Failed to update profile'
    );
  }

  return data;
}
