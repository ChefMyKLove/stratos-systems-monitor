import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchGeoSuggestions, RANDOM_CITIES } from '../utils/weather';

export default function SearchBar({ onSearch, onLocate, onRandom }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [highlighted, setHighlighted] = useState(-1);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);

  const fetchSuggestions = useCallback(async (q) => {
    try {
      const data = await fetchGeoSuggestions(q);
      setSuggestions(data);
      setOpen(true);
      setHighlighted(-1);
    } catch { setOpen(false); }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(() => fetchSuggestions(query.trim()), 280);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchSuggestions]);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) close();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function close() { setOpen(false); setSuggestions([]); setHighlighted(-1); }

  function select(r) {
    setQuery(r.name);
    close();
    onSearch(null, r.lat, r.lon);
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h+1, suggestions.length-1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h-1, -1)); }
    else if (e.key === 'Enter') {
      if (highlighted >= 0 && suggestions[highlighted]) select(suggestions[highlighted]);
      else { close(); onSearch(query); }
    }
    else if (e.key === 'Escape') close();
  }

  function handleRandom() {
    const city = RANDOM_CITIES[Math.floor(Math.random() * RANDOM_CITIES.length)];
    setQuery(city);
    onSearch(city);
  }

  const hasResults = open && suggestions.length > 0;

  return (
    <div className="glass-panel search-row">
      <div className={`search-wrap${hasResults ? ' has-results' : ''}`} ref={wrapRef}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter city name..."
          autoComplete="off"
        />
        {open && (
          <div className="autocomplete-dropdown">
            {suggestions.length === 0
              ? <div className="ac-empty">No cities found</div>
              : suggestions.map((r, i) => (
                <div
                  key={`${r.name}-${r.lat}`}
                  className={`ac-item${i === highlighted ? ' highlighted' : ''}`}
                  onMouseDown={() => select(r)}
                >
                  <span className="ac-city">{r.name}</span>
                  <span className="ac-meta">{r.state ? `${r.state}, ` : ''}{r.country}</span>
                </div>
              ))
            }
          </div>
        )}
      </div>
      <button className="btn primary" onClick={() => { close(); onSearch(query); }}>Search</button>
      <button className="btn locate" onClick={onLocate}>📍 My Location</button>
      <button className="btn random" onClick={handleRandom}>🎲 Random</button>
    </div>
  );
}
