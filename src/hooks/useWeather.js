import { useState, useCallback } from 'react';
import { fetchWeatherByCity, fetchWeatherByCoords } from '../utils/weather';

export function useWeather() {
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [error, setError] = useState('');
  const [data, setData] = useState(null); // { cur, fore, aqi }

  const loadByCity = useCallback(async (city) => {
    setStatus('loading');
    setError('');
    try {
      const result = await fetchWeatherByCity(city);
      setData(result);
      setStatus('success');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }, []);

  const loadByCoords = useCallback(async (lat, lon) => {
    setStatus('loading');
    setError('');
    try {
      const result = await fetchWeatherByCoords(lat, lon);
      setData(result);
      setStatus('success');
    } catch (e) {
      setError(e.message || 'Could not fetch weather for your location.');
      setStatus('error');
    }
  }, []);

  const clearError = useCallback(() => {
    setError('');
    if (status === 'error') setStatus('idle');
  }, [status]);

  return { status, error, data, loadByCity, loadByCoords, clearError };
}
