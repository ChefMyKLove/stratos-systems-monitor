import StarCanvas from './StarCanvas';
import GlassTitle from './GlassTitle';
import { useEarthquakes } from '../hooks/useEarthquakes';

const SEV_COLOR = { major: '#f87171', moderate: '#fb923c', minor: '#fbbf24', micro: 'rgba(226,232,240,0.4)' };
const SEV_DOT   = { major: '#f87171', moderate: '#fb923c', minor: '#fbbf24', micro: '#64748b' };

function MagBadge({ mag }) {
  const sev = mag >= 7 ? 'major' : mag >= 5 ? 'moderate' : mag >= 3 ? 'minor' : 'micro';
  return (
    <span style={{
      display: 'inline-block', minWidth: 46, textAlign: 'center',
      padding: '3px 8px', borderRadius: 8,
      background: `${SEV_COLOR[sev]}18`,
      border: `1px solid ${SEV_COLOR[sev]}55`,
      color: SEV_COLOR[sev], fontFamily: "'DM Mono', monospace",
      fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
    }}>
      {mag != null ? mag.toFixed(1) : '—'}
    </span>
  );
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function GeologicalPage({ onNavigate }) {
  const { data, status, minMag, setMinMag } = useEarthquakes();
  const features = data?.features ?? [];

  return (
    <>
      <StarCanvas condition="" />
      <div id="app">
        <header className="glass-panel">
          <div className="logo" onClick={() => onNavigate('splash')} style={{ cursor: 'pointer' }}>
            STRATOS<span>GEOLOGICAL</span>
          </div>
          <nav className="module-nav">
            <button className="module-btn" onClick={() => onNavigate('weather')}>🌤 Weather</button>
            <button className="module-btn active">🌍 Geological</button>
            <button className="module-btn" onClick={() => onNavigate('aurora')}>✨ Aurora</button>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {['2.5','4.0','6.0'].map(v => (
              <button key={v}
                className={`unit-toggle${minMag === parseFloat(v) ? ' active' : ''}`}
                onClick={() => setMinMag(parseFloat(v))}>
                M{v}+
              </button>
            ))}
          </div>
        </header>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px 40px' }}>
          {/* Title box */}
          <div className="splash-title-box" style={{ marginBottom: 16, textAlign: 'left', padding: '28px 36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <GlassTitle text="GEOLOGICAL" small />
                <div className="splash-logo-sub">Live Seismic Activity · USGS</div>
              </div>
              <div style={{ display: 'flex', gap: 20, fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>
                <span><span style={{ color: SEV_DOT.major }}>●</span> Major 7.0+</span>
                <span><span style={{ color: SEV_DOT.moderate }}>●</span> Moderate 5.0+</span>
                <span><span style={{ color: SEV_DOT.minor }}>●</span> Minor 3.0+</span>
              </div>
            </div>
          </div>

          {status === 'loading' && (
            <div id="loading" style={{ display: 'block' }}>
              <div className="spinner" />
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Fetching seismic data…</p>
            </div>
          )}

          {status === 'error' && (
            <div id="error-box" style={{ display: 'block' }}>
              ⚠ Could not reach the Stratos backend. Make sure it is running on port 3001.
            </div>
          )}

          {status === 'success' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Events', value: features.length, color: 'var(--accent)' },
                  { label: 'Significant (5.0+)', value: features.filter(f => f.properties.magnitude >= 5).length, color: '#fb923c' },
                  { label: 'Major (7.0+)', value: features.filter(f => f.properties.magnitude >= 7).length, color: '#f87171' },
                ].map(s => (
                  <div key={s.label} className="card" style={{ padding: '20px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontFamily: "'DM Mono', monospace", color: s.color, fontWeight: 700 }}>{s.value}</div>
                    <div className="card-label" style={{ justifyContent: 'center', marginTop: 6, marginBottom: 0 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="card span3" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '18px 24px 12px', borderBottom: '1px solid var(--glass-border)' }}>
                  <span className="card-label" style={{ marginBottom: 0 }}>
                    <span className="dot" />
                    Recent Earthquakes · M{minMag}+
                  </span>
                </div>
                <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                  {features.length === 0 && (
                    <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      No events found for M{minMag}+ in the last 24 hours.
                    </div>
                  )}
                  {features.map((f, i) => {
                    const p = f.properties;
                    const sev = p.severity || 'micro';
                    return (
                      <div key={f.id} style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        padding: '14px 24px',
                        borderBottom: i < features.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        transition: 'background 0.15s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <MagBadge mag={p.magnitude} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.title}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            Depth: {p.depth != null ? `${p.depth.toFixed(1)} km` : '—'}
                            {p.summary ? ` · ${p.summary}` : ''}
                          </div>
                        </div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {timeAgo(p.timestamp)}
                        </div>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: SEV_DOT[sev], boxShadow: `0 0 6px ${SEV_DOT[sev]}`, flexShrink: 0 }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
