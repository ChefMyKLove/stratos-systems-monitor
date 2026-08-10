import { useState, useCallback, useRef } from 'react';
import { fetchFullWeatherHistory } from '../utils/weather';

// Module-level cache so switching locations back and forth doesn't re-fetch ~85 years of data.
const cache = new Map();
function cacheKey(lat, lon) { return `${lat.toFixed(2)},${lon.toFixed(2)}`; }

export function useHistoricalWeather() {
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const loadedKey = useRef(null);

  const load = useCallback(async (lat, lon) => {
    const key = cacheKey(lat, lon);
    if (cache.has(key)) {
      loadedKey.current = key;
      setData(cache.get(key));
      setStatus('success');
      return;
    }
    loadedKey.current = key;
    setStatus('loading');
    setError('');
    try {
      const result = await fetchFullWeatherHistory(lat, lon);
      cache.set(key, result);
      setData(result);
      setStatus('success');
    } catch (e) {
      setError(e.message || 'Could not fetch weather history.');
      setStatus('error');
    }
  }, []);

  return { status, error, data, load };
}
