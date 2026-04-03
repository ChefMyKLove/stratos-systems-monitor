import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.DEV
  ? 'http://localhost:3001/api/systems'
  : 'https://stratos-systems-monitor-production.up.railway.app/api/systems';

// Always fetch 30 days of Kp history so range switching is instant (client-side filter)
export function useSpaceWeather() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch(`${API}/space-weather?kp_hours=720`);
      if (!res.ok) throw new Error(`Backend ${res.status}`);
      const json = await res.json();
      setData(json);
      setStatus('success');
    } catch (err) {
      setStatus('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    const id = setInterval(load, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  return { data, status, refresh: load };
}
