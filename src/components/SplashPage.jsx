import StarCanvas from './StarCanvas';
import GlassTitle from './GlassTitle';
import SearchBar from './SearchBar';

export default function SplashPage({ onNavigate, onSearch, onLocate, onRandom, weatherStatus, weatherCity }) {
  const cityReady = weatherStatus === 'success' && weatherCity;
  const cityLoading = weatherStatus === 'loading';

  return (
    <>
      <StarCanvas condition="" />
      <div id="splash">
        <div className="splash-stack">

          {/* Title */}
          <div className="splash-title-box">
            <GlassTitle text="STRATOS" filterId="glass-stratos" />
            <div className="splash-logo-sub">Global Systems Monitor</div>
          </div>

          {/* City search */}
          <div className="splash-nav-box" style={{ padding: '24px 28px' }}>
            <div className="card-label" style={{ marginBottom: 14, justifyContent: 'center' }}>
              <span className="dot" />
              Select your city for weather
            </div>
            <SearchBar onSearch={onSearch} onLocate={onLocate} onRandom={onRandom} />
            {cityLoading && (
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
                <span className="spinner" style={{ width: 14, height: 14, display: 'inline-block', marginRight: 8, verticalAlign: 'middle' }} />
                Loading weather data…
              </div>
            )}
            {cityReady && (
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--success)' }}>
                ✓ {weatherCity}
              </div>
            )}
          </div>

          {/* Module navigation */}
          <div className="splash-nav-box">
            <div className="splash-buttons">
              <button className="splash-btn splash-weather" onClick={() => onNavigate('weather')}>
                <span className="splash-btn-icon">🌤</span>
                <span className="splash-btn-label">
                  {cityReady ? weatherCity.split(',')[0] : 'Weather'}
                </span>
              </button>
              <button className="splash-btn splash-geo" onClick={() => onNavigate('geological')}>
                <span className="splash-btn-icon">🌍</span>
                <span className="splash-btn-label">Geological</span>
              </button>
              <button className="splash-btn splash-aurora" onClick={() => onNavigate('aurora')}>
                <span className="splash-btn-icon">✨</span>
                <span className="splash-btn-label">Aurora</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
