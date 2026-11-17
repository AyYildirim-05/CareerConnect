import apiRequest from './apiRequest';

export function fetchNotifications(token) {
  return apiRequest('/notifications', token);
}

export function markNotificationRead(id, token) {
  return apiRequest(`/notifications/${id}/read`, token, { method: 'PATCH' });
}

export function clearAllNotifications(token) {
  return apiRequest('/notifications', token, { method: 'DELETE' });
}