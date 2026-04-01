import StarCanvas from './StarCanvas';
import GlassTitle from './GlassTitle';

export default function SplashPage({ onNavigate }) {
  return (
    <>
      <StarCanvas condition="" />
      <div id="splash">
        <div className="splash-stack">
          <div className="splash-title-box">
            <GlassTitle text="STRATOS" filterId="glass-stratos" />
            <div className="splash-logo-sub">Global Systems Monitor</div>
          </div>
          <div className="splash-nav-box">
            <div className="splash-buttons">
              <button className="splash-btn splash-weather" onClick={() => onNavigate('weather')}>
                <span className="splash-btn-icon">🌤</span>
                <span className="splash-btn-label">Weather</span>
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
