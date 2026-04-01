import { windDir, fmtTime, aqiLabel } from '../utils/weather';

export function AtmosphereCard({ cur }) {
  const pMin = 970, pMax = 1050;
  const pPct = Math.max(0, Math.min(100, ((cur.main.pressure - pMin) / (pMax - pMin)) * 100));
  return (
    <div className="card">
      <div className="card-label"><span className="dot" style={{ background: 'var(--accent2)', boxShadow: '0 0 6px var(--accent2)' }} />&nbsp;Atmosphere</div>
      <div className="stat-grid">
        <div className="stat"><div className="stat-val" style={{ color: 'var(--accent)' }}>{cur.main.humidity}%</div><div className="stat-key">Humidity</div></div>
        <div className="stat"><div className="stat-val" style={{ color: 'var(--accent2)' }}>{cur.main.pressure}</div><div className="stat-key">hPa Pressure</div></div>
        <div className="stat" style={{ marginTop: 8 }}><div className="stat-val" style={{ color: 'var(--muted)', fontSize: 18 }}>{(cur.visibility / 1000).toFixed(1)} km</div><div className="stat-key">Visibility</div></div>
        <div className="stat" style={{ marginTop: 8 }}><div className="stat-val" style={{ color: 'var(--warm)', fontSize: 18 }}>{cur.clouds.all}%</div><div className="stat-key">Cloud Cover</div></div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 5 }}>Pressure Trend</div>
        <div style={{ height: 5, borderRadius: 3, background: 'linear-gradient(to right,#60a5fa,var(--accent2))', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -5, left: `${pPct}%`, width: 15, height: 15, borderRadius: '50%', background: 'white', transform: 'translateX(-50%)', boxShadow: '0 0 5px rgba(255,255,255,.4)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--muted)', marginTop: 5 }}><span>Low</span><span>Normal</span><span>High</span></div>
      </div>
    </div>
  );
}

export function WindCard({ cur }) {
  return (
    <div className="card">
      <div className="card-label"><span className="dot" style={{ background: 'var(--success)', boxShadow: '0 0 6px var(--success)' }} />&nbsp;Wind</div>
      <div className="compass-wrap">
        <div className="compass">
          <div className="compass-needle" style={{ transform: `translateX(-50%) rotate(${cur.wind.deg}deg)`, position: 'absolute', top: 8, left: '50%' }} />
          <div className="compass-dot" style={{ top: '50%', left: '50%' }} />
          <div className="compass-labels">
            <span className="n">N</span><span className="s">S</span>
            <span className="e">E</span><span className="w">W</span>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>
            {cur.wind.speed.toFixed(1)} <span style={{ fontSize: 13, opacity: .6 }}>m/s</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{windDir(cur.wind.deg)} · {(cur.wind.speed * 3.6).toFixed(0)} km/h</div>
          {cur.wind.gust && <div style={{ fontSize: 10, color: 'var(--accent3)', marginTop: 2 }}>Gusts {cur.wind.gust.toFixed(1)} m/s</div>}
        </div>
      </div>
    </div>
  );
}

export function SunCard({ cur }) {
  const now = Date.now() / 1000;
  const sunProgress = Math.max(0, Math.min(1, (now - cur.sys.sunrise) / (cur.sys.sunset - cur.sys.sunrise)));
  const t = Math.max(0.02, Math.min(0.98, sunProgress));
  const sx = (10 + t * 180).toFixed(1);
  const sy = (75 - 85 * Math.sin(Math.PI * t)).toFixed(1);
  const mins = Math.round((cur.sys.sunset - cur.sys.sunrise) / 60);

  return (
    <div className="card">
      <div className="card-label"><span className="dot" style={{ background: 'var(--warm)', boxShadow: '0 0 6px var(--warm)' }} />&nbsp;Sun</div>
      <div className="sun-arc">
        <svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="sunGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#fb923c" stopOpacity="0.3" />
            </linearGradient>
            <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <path d="M 10 75 Q 100 -10 190 75" stroke="url(#sunGrad)" strokeWidth="2" fill="none" strokeDasharray="4 4" />
          <circle cx={sx} cy={sy} r="7" fill="#fbbf24" opacity="0.9" filter="url(#glow)" />
          <circle cx={sx} cy={sy} r="12" fill="#fbbf24" opacity="0.15" />
        </svg>
      </div>
      <div className="sun-times">
        <div><div className="sun-time-val">🌅 {fmtTime(cur.sys.sunrise)}</div><div style={{ fontSize: 9, color: 'var(--muted)' }}>Sunrise</div></div>
        <div style={{ textAlign: 'right' }}><div className="sun-time-val">🌇 {fmtTime(cur.sys.sunset)}</div><div style={{ fontSize: 9, color: 'var(--muted)' }}>Sunset</div></div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 10, fontSize: 10, color: 'var(--muted)' }}>
        Day length: {Math.floor(mins / 60)}h {mins % 60}m
      </div>
    </div>
  );
}

export function AQICard({ aqi }) {
  if (!aqi?.list?.[0]) return null;
  const val = aqi.list[0];
  const { label, color } = aqiLabel(val.main.aqi);
  return (
    <div className="card">
      <div className="card-label"><span className="dot" style={{ background: '#60a5fa', boxShadow: '0 0 6px #60a5fa' }} />&nbsp;Air Quality</div>
      <div className="aqi-ring">
        <div className="aqi-circle" style={{ borderColor: color }}>
          <div className="aqi-num" style={{ color }}>{val.main.aqi}</div>
          <div className="aqi-label-sm">AQI</div>
        </div>
        <div>
          <div style={{ fontSize: 14, fontFamily: "'Syne',sans-serif", fontWeight: 600, color, marginBottom: 6 }}>{label}</div>
          <div className="aqi-pollutants">
            PM2.5: <b>{val.components.pm2_5.toFixed(1)}</b> µg/m³<br />
            PM10: <b>{val.components.pm10.toFixed(1)}</b> µg/m³<br />
            O₃: <b>{val.components.o3.toFixed(1)}</b> µg/m³<br />
            NO₂: <b>{val.components.no2.toFixed(1)}</b> µg/m³
          </div>
        </div>
      </div>
    </div>
  );
}
