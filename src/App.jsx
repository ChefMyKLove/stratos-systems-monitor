import { useState, useCallback } from 'react';
import StarCanvas from './components/StarCanvas';
import SplashPage from './components/SplashPage';
import GeologicalPage from './components/GeologicalPage';
import AuroraPage from './components/AuroraPage';
import SearchBar from './components/SearchBar';
import HeroCard from './components/HeroCard';
import { AtmosphereCard, WindCard, SunCard, AQICard } from './components/WeatherCards';
import { ForecastCard, HourlyCarousel } from './components/ForecastCards';
import SavedLocations from './components/SavedLocations';
import { useWeather } from './hooks/useWeather';
import { useSavedLocations } from './hooks/useSavedLocations';
import { groupForecastByDay, RANDOM_CITIES } from './utils/weather';

export default function App() {
  const [view, setView] = useState('splash');
  const { status, error, data, loadByCity, loadByCoords, clearError } = useWeather();
  const { locations, save, remove } = useSavedLocations();
  const [unit, setUnit] = useState('C');
  const [locBannerDismissed, setLocBannerDismissed] = useState(
    () => !!localStorage.getItem('stratos_banner_dismissed')
  );
  const [toast, setToast] = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  function handleSearch(query, lat, lon) {
    clearError();
    setToast('');
    if (lat != null && lon != null) loadByCoords(lat, lon);
    else if (query?.trim()) loadByCity(query.trim());
  }

  function handleLocate() {
    dismissBanner();
    if (!navigator.geolocation) { showToast('Geolocation not supported.'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => loadByCoords(pos.coords.latitude, pos.coords.longitude),
      () => showToast('Location access denied. Try searching a city instead.')
    );
  }

  function handleRandom() {
    const city = RANDOM_CITIES[Math.floor(Math.random() * RANDOM_CITIES.length)];
    loadByCity(city);
  }

  function dismissBanner() {
    setLocBannerDismissed(true);
    localStorage.setItem('stratos_banner_dismissed', '1');
  }

  function handleSave() {
    if (!data) { showToast('Search a city first before saving.'); return; }
    const { name } = data.cur;
    const country = data.cur.sys.country;
    const key = `${name}, ${country}`;
    if (locations.includes(key)) { showToast('Already saved.'); return; }
    if (locations.length >= 5) { showToast('Max 5 saved locations. Remove one first.'); return; }
    save(name, country);
  }

  function handleLoadSaved(loc) {
    const city = loc.split(',')[0].trim();
    loadByCity(city);
  }

  const condition = data?.cur?.weather?.[0]?.main || '';
  const days = data ? groupForecastByDay(data.fore.list) : {};
  const hourly = data ? data.fore.list.slice(0, 16) : [];
  const currentRef = data ? { name: data.cur.name, country: data.cur.sys.country } : null;

  if (view === 'splash') return <SplashPage
    onNavigate={setView}
    onSearch={handleSearch}
    onLocate={handleLocate}
    onRandom={handleRandom}
    weatherStatus={status}
    weatherCity={data?.cur ? `${data.cur.name}, ${data.cur.sys.country}` : null}
  />;
  if (view === 'geological') return <GeologicalPage onNavigate={setView} weatherCity={data?.cur ? `${data.cur.name}, ${data.cur.sys.country}` : null} />;
  if (view === 'aurora') return <AuroraPage onNavigate={setView} weatherCity={data?.cur ? `${data.cur.name}, ${data.cur.sys.country}` : null} weatherLat={data?.cur?.coord?.lat ?? null} />;

  return (
    <>
      <StarCanvas condition={condition} />
      <div id="app">
        <header className="glass-panel">
          <div className="logo" onClick={() => setView('splash')} style={{ cursor: 'pointer' }} title="Back to STRATOS">STRATOS<span>WEATHER</span></div>
          <nav className="module-nav">
            <button className="module-btn active">🌤 Weather</button>
            <button className="module-btn" onClick={() => setView('geological')}>🌍 Geological</button>
            <button className="module-btn" onClick={() => setView('aurora')}>✨ Aurora</button>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className={`unit-toggle${unit === 'C' ? ' active' : ''}`} onClick={() => setUnit('C')}>°C</button>
            <button className={`unit-toggle${unit === 'F' ? ' active' : ''}`} onClick={() => setUnit('F')}>°F</button>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>v3.0 · OpenWeatherMap</div>
          </div>
        </header>

        <SearchBar onSearch={handleSearch} onLocate={handleLocate} onRandom={handleRandom} />

        {!locBannerDismissed && (
          <div id="permBanner">
            <p>📍 Allow STRATOS to use your current location for local weather?</p>
            <div className="actions">
              <button className="btn locate" onClick={handleLocate}>Allow</button>
              <button className="btn" onClick={dismissBanner}>Dismiss</button>
            </div>
          </div>
        )}

        {(toast || (status === 'error' && error)) && (
          <div id="error-box" style={{ display: 'block' }} onClick={clearError}>
            ⚠ {toast || error}
          </div>
        )}

        {status === 'loading' && (
          <div id="loading" style={{ display: 'block' }}>
            <div className="spinner" />
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Fetching atmospheric data…</p>
          </div>
        )}

        {(status === 'idle' || status === 'error') && !toast && (
          <div id="welcome">
            <div className="big">STRATOS</div>
            <p>Search a city, use your location, or hit Random to begin.</p>
          </div>
        )}

        {status === 'success' && data && (
          <div className="grid">
            <HeroCard cur={data.cur} unit={unit} onSave={handleSave} />
            <AtmosphereCard cur={data.cur} />
            <WindCard cur={data.cur} />
            <SunCard cur={data.cur} />
            <AQICard aqi={data.aqi} />
            <ForecastCard days={days} unit={unit} />
            <SavedLocations
              locations={locations}
              current={currentRef}
              onLoad={handleLoadSaved}
              onRemove={remove}
              onSave={handleSave}
            />
            <HourlyCarousel hourly={hourly} unit={unit} />
          </div>
        )}
      </div>
    </>
  );
}
