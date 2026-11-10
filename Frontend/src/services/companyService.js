import apiRequest from './apiRequest';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5500/api';

/**
 * Fetch all companies
 * @param {string} token
 */
export function fetchCompanies(token) {
  return apiRequest('/companies', token);
}

/**
 * Fetch a company page with its published jobs
 * @param {string} id
 * @param {string} token
 */
export function fetchCompany(id, token) {
  return apiRequest(`/companies/${id}`, token);
}

/**
 * Fetch the logged-in recruiter's company ({ company: null } if not set up yet)
 * @param {string} token
 */
export function fetchMyCompany(token) {
  return apiRequest('/companies/mine', token);
}

/**
 * Set up the logged-in recruiter's company page
 * @param {Object} companyData - { name, description, industry, size, website, location }
 * @param {string} token
 */
export function createCompany(companyData, token) {
  return apiRequest('/companies', token, { method: 'POST', body: companyData });
}

/**
 * Edit the logged-in recruiter's company page
 * @param {Object} companyData
 * @param {string} token
 */
export function updateMyCompany(companyData, token) {
  return apiRequest('/companies/mine', token, { method: 'PUT', body: companyData });
}

/**
 * Join an existing company as a member
 * @param {string} id
 * @param {string} token
 */
export function joinCompany(id, token) {
  return apiRequest(`/companies/${id}/join`, token, { method: 'POST' });
}

/**
 * Upload or replace the logged-in recruiter's company logo or banner
 * @param {'logo'|'banner'} field
 * @param {File} file - PNG, JPEG or WebP image (max 300 KB)
 * @param {string} token
 */
export async function uploadCompanyImage(field, file, token) {
  const formData = new FormData();
  formData.append(field, file);

  // apiRequest only sends JSON, so post the multipart form directly
  const response = await fetch(`${API_BASE_URL}/companies/mine/${field}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });

  const data = await response.json();
  if (!response.ok) {
    throw data;
  }
  return data;
}

/**
 * Remove the logged-in recruiter's company logo or banner
 * @param {'logo'|'banner'} field
 * @param {string} token
 */
export function removeCompanyImage(field, token) {
  return apiRequest(`/companies/mine/${field}`, token, { method: 'DELETE' });
}
