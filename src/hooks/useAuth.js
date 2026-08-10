import { useState, useEffect, useCallback } from 'react';
import { isTokenValid, TOKEN_KEY } from '../utils/auth';

function incomingParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function useAuth() {
  const [token, setToken] = useState(() => incomingParam('token') || localStorage.getItem(TOKEN_KEY));
  const [authError] = useState(() =>
    incomingParam('auth') === 'denied' ? 'Access requires an active paid Patreon membership.' : ''
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incoming = params.get('token');
    const denied = params.get('auth') === 'denied';
    if (!incoming && !denied) return;

    if (incoming) localStorage.setItem(TOKEN_KEY, incoming);

    params.delete('token');
    params.delete('auth');
    const clean = window.location.pathname + (params.toString() ? `?${params}` : '');
    window.history.replaceState({}, '', clean);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  return { token, isAuthenticated: isTokenValid(token), authError, logout };
}
