// Backend stores cover/inline image URLs as `/api/uploads/lesson-images/...`,
// which only resolves when frontend and backend share an origin (or a proxy).
// In production (Vercel + Railway) we need to prepend the backend origin
// derived from VITE_API_URL.
const API_URL = import.meta.env.VITE_API_URL || '/api';
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export function resolveImageUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/api/') && API_ORIGIN) return `${API_ORIGIN}${url}`;
  return url;
}
