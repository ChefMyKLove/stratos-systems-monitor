import StarCanvas from './StarCanvas';
import GlassTitle from './GlassTitle';

export default function ComingSoon({ title, icon, onNavigate }) {
  return (
    <>
      <StarCanvas condition="" />
      <div id="splash">
        <div className="splash-stack">
          <div className="splash-title-box">
            <div className="coming-soon-icon">{icon}</div>
            <GlassTitle text={title} filterId={`glass-${title.toLowerCase()}`} small />
            <div className="splash-logo-sub">Global Systems Monitor</div>
          </div>
          <div className="splash-nav-box">
            <div className="coming-soon-badge">Coming Soon</div>
            <p className="coming-soon-desc">
              This module is currently under development.<br />
              Check back soon for real-time {title.toLowerCase()} data.
            </p>
            <div className="coming-soon-actions">
              <button className="splash-btn splash-weather" onClick={() => onNavigate('weather')}>
                <span className="splash-btn-icon">🌤</span>
                <span className="splash-btn-label">Weather</span>
              </button>
              <button className="splash-btn" onClick={() => onNavigate('splash')}>
                <span className="splash-btn-icon">⬡</span>
                <span className="splash-btn-label">Home</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
