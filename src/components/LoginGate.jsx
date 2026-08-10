import StarCanvas from './StarCanvas';
import GlassTitle from './GlassTitle';
import { patreonLoginUrl } from '../utils/auth';

export default function LoginGate({ error }) {
  return (
    <>
      <StarCanvas condition="" />
      <div id="splash">
        <div className="splash-stack">
          <div className="splash-title-box">
            <GlassTitle text="STRATOS" filterId="glass-stratos-gate" />
            <div className="splash-logo-sub">Members-Only Weather Intelligence</div>
          </div>

          <div className="splash-nav-box login-gate-box">
            <div className="card-label" style={{ marginBottom: 14, justifyContent: 'center' }}>
              <span className="dot" style={{ background: 'var(--accent2)', boxShadow: '0 0 6px var(--accent2)' }} />
              Patreon Members Only
            </div>
            <p className="login-gate-copy">
              STRATOS is available exclusively to paid Patreon supporters. Log in with your
              Patreon account to unlock live weather, geological, and aurora data.
            </p>
            {error && <p className="login-gate-error">⚠ {error}</p>}
            <a className="btn primary login-gate-btn" href={patreonLoginUrl()}>🔑 Log in with Patreon</a>
          </div>
        </div>
      </div>
    </>
  );
}
