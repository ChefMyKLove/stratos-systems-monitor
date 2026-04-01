import StarCanvas from './StarCanvas';
import GlassTitle from './GlassTitle';
import { useSpaceWeather } from '../hooks/useSpaceWeather';

const KP_LABELS = ['Quiet','Quiet','Quiet','Unsettled','Active','G1 Storm','G2 Storm','G3 Storm','G4 Storm','G5 Storm'];
const KP_COLOR  = (kp) => {
  if (kp >= 8) return '#f87171';
  if (kp >= 6) return '#fb923c';
  if (kp >= 5) return '#fbbf24';
  if (kp >= 4) return '#a78bfa';
  return '#7ee8fa';
};

// Approximate lowest latitude where aurora may be visible given Kp
const KP_VISIBILITY = (kp) => {
  if (kp >= 9) return '< 40° (mid-latitudes)';
  if (kp >= 7) return '~50° (northern US, central Europe)';
  if (kp >= 5) return '~60° (Canada, Scandinavia)';
  if (kp >= 4) return '~65° (northern Canada, Iceland)';
  return '~70°+ (Arctic)';
};

function KpGauge({ kp }) {
  const pct = Math.min((kp / 9) * 100, 100);
  const color = KP_COLOR(kp);
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 16px' }}>
        <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
          <circle cx="70" cy="70" r="58" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${2 * Math.PI * 58}`}
            strokeDashoffset={`${2 * Math.PI * 58 * (1 - pct / 100)}`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 42, fontFamily: "'DM Mono', monospace", fontWeight: 700, color, lineHeight: 1 }}>{kp.toFixed(1)}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.15em', marginTop: 4 }}>Kp INDEX</div>
        </div>
      </div>
      <div style={{ fontSize: 14, color, fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>{KP_LABELS[Math.round(kp)] ?? 'Unknown'}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Visible from {KP_VISIBILITY(kp)}</div>
    </div>
  );
}

function KpBar({ entries }) {
  if (!entries.length) return null;
  const max = 9;
  return (
    <div>
      <div className="card-label"><span className="dot" />Kp History (24h)</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }}>
        {entries.slice(0, 24).reverse().map((e, i) => {
          const kp = e.magnitude ?? 0;
          const h = Math.max(4, (kp / max) * 60);
          return (
            <div key={i} title={`Kp ${kp.toFixed(1)}`} style={{
              flex: 1, height: h, borderRadius: 3,
              background: KP_COLOR(kp),
              opacity: 0.7 + (i / 24) * 0.3,
              transition: 'height 0.4s ease',
            }} />
          );
        })}
      </div>
    </div>
  );
}

export default function AuroraPage({ onNavigate }) {
  const { data, status } = useSpaceWeather();

  const latestKp = data?.kp?.[0]?.magnitude ?? null;
  const latestWind = data?.solar_wind?.[0];
  const alerts = data?.alerts ?? [];

  return (
    <>
      <StarCanvas condition="" />
      <div id="app">
        <header className="glass-panel">
          <div className="logo" onClick={() => onNavigate('splash')} style={{ cursor: 'pointer' }}>
            STRATOS<span>AURORA</span>
          </div>
          <nav className="module-nav">
            <button className="module-btn" onClick={() => onNavigate('weather')}>🌤 Weather</button>
            <button className="module-btn" onClick={() => onNavigate('geological')}>🌍 Geological</button>
            <button className="module-btn active">✨ Aurora</button>
          </nav>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>NOAA SWPC</div>
        </header>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px 40px' }}>
          <div className="splash-title-box" style={{ marginBottom: 16, textAlign: 'left', padding: '28px 36px' }}>
            <GlassTitle text="AURORA" small />
            <div className="splash-logo-sub">Space Weather Monitor · NOAA SWPC</div>
          </div>

          {status === 'loading' && (
            <div id="loading" style={{ display: 'block' }}>
              <div className="spinner" />
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Fetching space weather data…</p>
            </div>
          )}

          {status === 'error' && (
            <div id="error-box" style={{ display: 'block' }}>
              ⚠ Could not reach the Stratos backend. Make sure it is running on port 3001.
            </div>
          )}

          {status === 'success' && data && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>

              {/* Kp gauge */}
              <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                {latestKp != null ? <KpGauge kp={latestKp} /> : <span style={{ color: 'var(--muted)' }}>No data</span>}
              </div>

              {/* Solar wind */}
              <div className="card">
                <div className="card-label"><span className="dot" style={{ background: '#fb923c', boxShadow: '0 0 6px #fb923c' }} />Solar Wind</div>
                {latestWind ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                    {[
                      { label: 'Speed', value: latestWind.magnitude != null ? `${Math.round(latestWind.magnitude)} km/s` : '—', color: latestWind.magnitude > 700 ? '#f87171' : latestWind.magnitude > 500 ? '#fb923c' : 'var(--text)' },
                      { label: 'Severity', value: latestWind.severity || '—', color: 'var(--muted)' },
                      { label: 'Summary', value: latestWind.summary || '—', color: 'var(--muted)' },
                    ].map(row => (
                      <div key={row.label}>
                        <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>{row.label}</div>
                        <div style={{ fontSize: row.label === 'Summary' ? 12 : 22, fontFamily: row.label === 'Summary' ? "'DM Mono', monospace" : "'Syne', sans-serif", fontWeight: 700, color: row.color }}>{row.value}</div>
                      </div>
                    ))}
                  </div>
                ) : <div style={{ color: 'var(--muted)', fontSize: 13 }}>No data</div>}
              </div>

              {/* Alerts */}
              <div className="card">
                <div className="card-label"><span className="dot" style={{ background: '#a78bfa', boxShadow: '0 0 6px #a78bfa' }} />Space Weather Alerts</div>
                {alerts.length === 0 ? (
                  <div style={{ color: 'var(--success)', fontSize: 13, marginTop: 8 }}>✓ No active alerts</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
                    {alerts.slice(0, 5).map((a, i) => (
                      <div key={i} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)' }}>
                        <div style={{ fontSize: 11, color: '#f87171', fontFamily: "'DM Mono', monospace", marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{a.severity}</div>
                        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>{a.title}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Kp history bar chart — full width */}
              <div className="card span3">
                <KpBar entries={data.kp || []} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
