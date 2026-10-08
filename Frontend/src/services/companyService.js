import apiRequest from './apiRequest';

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
