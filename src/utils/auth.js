export const TOKEN_KEY = 'stratos_token';

export const BACKEND_URL = import.meta.env.DEV
  ? 'http://localhost:3001'
  : 'https://stratos-systems-monitor-production.up.railway.app';

export function patreonLoginUrl() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: import.meta.env.VITE_PATREON_CLIENT_ID,
    redirect_uri: import.meta.env.VITE_PATREON_REDIRECT_URI,
    scope: 'identity identity.memberships',
  });
  return `https://www.patreon.com/oauth2/authorize?${params}`;
}

// Client-side check only, so the UI doesn't show a dead session before the
// backend rejects it — the backend's own JWT verification is what actually enforces access.
export function isTokenValid(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
