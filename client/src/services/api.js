/**
 * Authenticated fetch wrapper.
 * Attaches JWT token from localStorage to every request.
 */
export async function apiFetch(url, options = {}) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}
