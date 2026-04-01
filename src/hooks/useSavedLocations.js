import { useState, useCallback } from 'react';

const KEY = 'stratos_locations';
const MAX = 5;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

export function useSavedLocations() {
  const [locations, setLocations] = useState(load);

  const save = useCallback((name, country) => {
    const key = `${name}, ${country}`;
    setLocations(prev => {
      if (prev.includes(key)) return prev;
      if (prev.length >= MAX) return prev; // caller should check & show error
      const next = [...prev, key];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
    return locations.includes(`${name}, ${country}`) ? 'exists'
      : locations.length >= MAX ? 'full' : 'ok';
  }, [locations]);

  const remove = useCallback((key) => {
    setLocations(prev => {
      const next = prev.filter(l => l !== key);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const canSave = (name, country) => {
    const key = `${name}, ${country}`;
    if (locations.includes(key)) return 'exists';
    if (locations.length >= MAX) return 'full';
    return 'ok';
  };

  return { locations, save, remove, canSave };
}
