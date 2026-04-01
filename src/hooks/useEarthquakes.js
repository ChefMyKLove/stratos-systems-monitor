import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:3001/api/systems';

export function useEarthquakes() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [minMag, setMinMag] = useState(2.5);

  const load = useCallback(async (mag = minMag) => {
    setStatus('loading');
    try {
      const res = await fetch(`${API}/earthquakes?min_magnitude=${mag}&limit=100`);
      if (!res.ok) throw new Error(`Backend ${res.status}`);
      const json = await res.json();
      setData(json);
      setStatus('success');
    } catch (err) {
      setStatus('error');
    }
  }, [minMag]);

  useEffect(() => { load(minMag); }, [minMag]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const id = setInterval(() => load(minMag), 2 * 60 * 1000);
    return () => clearInterval(id);
  }, [minMag, load]);

  return { data, status, minMag, setMinMag, refresh: load };
}
