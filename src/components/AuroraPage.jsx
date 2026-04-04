import { useState } from 'react';
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

// ─── Aurora lat/Kp model ────────────────────────────────────────────────────
const getRequiredKp = (absLat) => {
  if (absLat >= 68) return 3;
  if (absLat >= 65) return 4;
  if (absLat >= 60) return 5;
  if (absLat >= 50) return 7;
  if (absLat >= 40) return 9;
  return 10;
};

const getAuroraReachLat = (kp) => {
  if (kp >= 9) return 40;
  if (kp >= 7) return 50;
  if (kp >= 5) return 60;
  if (kp >= 4) return 65;
  if (kp >= 3) return 68;
  return 72;
};

const KP_VISIBILITY = (kp) => {
  if (kp >= 9) return '< 40° (mid-latitudes)';
  if (kp >= 7) return '~50° (northern US, central Europe)';
  if (kp >= 5) return '~60° (Canada, Scandinavia)';
  if (kp >= 4) return '~65° (northern Canada, Iceland)';
  return '~70°+ (Arctic)';
};

// ─── NOAA alert parser ───────────────────────────────────────────────────────
function decodeSwpcCode(code) {
  if (!code) return 'Space Weather Notice';
  if (code.startsWith('ALTK')) return 'Geomagnetic K-index Alert';
  if (code.startsWith('WARK')) return 'Geomagnetic K-index Warning';
  if (code.startsWith('WATK')) return 'Geomagnetic Watch';
  if (code.startsWith('ALTS')) return 'Solar Radiation Storm Alert';
  if (code.startsWith('WARS')) return 'Solar Radiation Warning';
  if (code.startsWith('WATS')) return 'Solar Radiation Watch';
  if (code.startsWith('ALTR') || code.startsWith('WARR')) return 'Radio Blackout';
  if (code.startsWith('SUMX') || code.startsWith('SUMM')) return 'Solar Flare Summary';
  if (code.startsWith('ALT')) return 'Space Weather Alert';
  if (code.startsWith('WAR')) return 'Space Weather Warning';
  if (code.startsWith('WAT')) return 'Space Weather Watch';
  if (code.startsWith('SUM')) return 'Activity Summary';
  if (code.startsWith('CAN')) return 'Cancellation';
  return 'Space Weather Notice';
}

// Map alert code to the most relevant NOAA page
function getNoaaUrl(code) {
  const c = (code || '').toUpperCase();
  if (c.match(/^(ALTK|WARK|WATK)/)) return 'https://www.swpc.noaa.gov/phenomena/geomagnetic-storms';
  if (c.match(/^(ALTS|WARS|WATS)/)) return 'https://www.swpc.noaa.gov/phenomena/solar-radiation-storms';
  if (c.match(/^(ALTR|WARR)/))       return 'https://www.swpc.noaa.gov/phenomena/radio-blackout';
  if (c.match(/^(SUMX|SUMM)/))       return 'https://www.swpc.noaa.gov/products/solar-and-geophysical-activity-summary';
  return 'https://www.swpc.noaa.gov/products/alerts-watches-and-warnings';
}

function parseSwpcAlert(a) {
  const raw = a.summary || a.title || '';
  const lines = raw.split('\n').map(l => l.trim());

  const codeMatch = raw.match(/Message Code:\s*(\S+)/i);
  const code = (codeMatch?.[1] || '').toUpperCase();
  const typeLabel = decodeSwpcCode(code);

  const eventLine = lines.find(l => /^(ALERT|WARNING|WATCH|SUMMARY|CANCEL|EXTENDED):/i.test(l));
  const eventType = eventLine?.match(/^(\w+):/)?.[1]?.toUpperCase() || 'ALERT';
  const eventText = eventLine
    ? eventLine.replace(/^(ALERT|WARNING|WATCH|SUMMARY|CANCEL|EXTENDED):\s*/i, '').trim()
    : null;

  const scaleMatch = raw.match(/NOAA Scale:\s*([A-Z]\d[^\n,]*)/i);
  const scale = scaleMatch?.[1]?.trim().split(/\s+or\s+/i)[0].trim() || null;

  const impactMatch = raw.match(/Potential Impacts?:([^\n]+(?:\n(?!\n)[^\n]+)*)/i);
  const impact = impactMatch?.[1]
    ?.replace(/\n/g, ' ')
    .trim()
    .split('.')[0]
    .replace(/^Area of impact primarily /i, '') || null;

  return { code, typeLabel, eventType, eventText, scale, impact, issuedAt: a.issued_at, noaaUrl: getNoaaUrl(code) };
}

const EVENT_TYPE_COLORS = {
  ALERT:    '#f87171',
  WARNING:  '#fb923c',
  WATCH:    '#fbbf24',
  SUMMARY:  '#7ee8fa',
  CANCEL:   'rgba(226,232,240,0.3)',
  EXTENDED: '#a78bfa',
};

const noaaScaleColor = (scale) => {
  if (!scale) return 'var(--muted)';
  const n = parseInt(scale[1]);
  if (n >= 4) return '#f87171';
  if (n >= 3) return '#fb923c';
  if (n >= 2) return '#fbbf24';
  return '#a78bfa';
};

// ─── Sub-components ──────────────────────────────────────────────────────────
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

// KpBar owns its own range state and filters client-side — no re-fetch, no page flash
const KP_RANGES = [
  { label: '1h',  hours: 1   },
  { label: '24h', hours: 24  },
  { label: '72h', hours: 72  },
  { label: '7d',  hours: 168 },
  { label: '30d', hours: 720 },
];

function KpBar({ entries }) {
  const [range, setRange] = useState(24);

  // Client-side filter — instant, no re-fetch
  const cutoff = new Date(Date.now() - range * 60 * 60 * 1000);
  const filtered = entries.filter(e => e.timestamp && new Date(e.timestamp) >= cutoff);
  const bars = [...filtered].reverse(); // oldest → newest left to right

  const H = 88;
  const barGap = bars.length > 100 ? 1 : bars.length > 40 ? 2 : bars.length > 20 ? 3 : 4;

  const thresholds = [
    { kp: 5, label: 'G1', color: '#fbbf24' },
    { kp: 7, label: 'G3', color: '#fb923c' },
    { kp: 9, label: 'G5', color: '#f87171' },
  ];

  const fmtTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    if (range <= 72) return d.toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    return d.toLocaleString('en-GB', { month: 'short', day: 'numeric' });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div className="card-label" style={{ marginBottom: 0 }}>
          <span className="dot" />Kp History
          <span style={{ marginLeft: 8, fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: "'DM Mono', monospace" }}>
            {bars.length} readings
          </span>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {KP_RANGES.map(r => (
            <button key={r.label}
              className={`unit-toggle${range === r.hours ? ' active' : ''}`}
              onClick={() => setRange(r.hours)}
              style={{ fontSize: 10, padding: '3px 9px' }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>

        {/* Y-axis */}
        <div style={{ position: 'relative', height: H, width: 22, flexShrink: 0 }}>
          {[9, 7, 5, 3, 0].map(v => (
            <div key={v} style={{
              position: 'absolute',
              right: 0,
              bottom: `${(v / 9) * 100}%`,
              transform: 'translateY(50%)',
              fontSize: 8.5,
              fontFamily: "'DM Mono', monospace",
              color: v === 0 ? 'rgba(255,255,255,0.15)' : KP_COLOR(v),
              lineHeight: 1,
              opacity: v === 0 ? 1 : 0.7,
            }}>{v}</div>
          ))}
        </div>

        {/* Bars + threshold lines */}
        <div style={{ flex: 1, position: 'relative', height: H }}>

          {/* Threshold lines */}
          {thresholds.map(t => (
            <div key={t.kp} style={{
              position: 'absolute', left: 0, right: 0,
              bottom: `${(t.kp / 9) * 100}%`,
              height: 1,
              background: t.color,
              opacity: 0.22,
              zIndex: 2,
              pointerEvents: 'none',
            }}>
              <span style={{
                position: 'absolute', right: 0, bottom: 2,
                fontSize: 8, color: t.color,
                fontFamily: "'DM Mono', monospace",
                opacity: 0.6,
              }}>{t.label}</span>
            </div>
          ))}

          {/* Bars */}
          <div style={{
            display: 'flex', alignItems: 'flex-end',
            gap: barGap, height: H,
            position: 'relative', zIndex: 3,
          }}>
            {bars.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 12, alignSelf: 'center', width: '100%', textAlign: 'center' }}>
                No Kp data for this range yet
              </div>
            ) : bars.map((e, i) => {
              const kp = e.magnitude ?? 0;
              const h = Math.max(3, (kp / 9) * H);
              return (
                <div key={i}
                  title={`Kp ${kp.toFixed(1)}  ·  ${fmtTime(e.timestamp)}`}
                  style={{
                    flex: 1, height: h, borderRadius: 2,
                    background: KP_COLOR(kp),
                    opacity: 0.55 + (i / bars.length) * 0.45,
                    transition: 'height 0.4s ease',
                    minWidth: bars.length > 100 ? 1 : 2,
                    cursor: 'default',
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* X-axis */}
      {bars.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 5, paddingLeft: 30,
          fontSize: 9.5, fontFamily: "'DM Mono', monospace",
          color: 'rgba(255,255,255,0.2)',
        }}>
          <span>{fmtTime(bars[0]?.timestamp)}</span>
          {bars.length > 4 && (
            <span>{fmtTime(bars[Math.floor(bars.length / 2)]?.timestamp)}</span>
          )}
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>now</span>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Quiet  Kp 0–3',  color: '#7ee8fa' },
          { label: 'Active  Kp 4',   color: '#a78bfa' },
          { label: 'G1–G2  Kp 5–6', color: '#fbbf24' },
          { label: 'G3  Kp 7',       color: '#fb923c' },
          { label: 'G4–G5  Kp 8–9', color: '#f87171' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 9, height: 9, borderRadius: 2, background: l.color, opacity: 0.85 }} />
            <span style={{ fontSize: 9.5, color: 'var(--muted)', fontFamily: "'DM Mono', monospace" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertCard({ alert }) {
  const p = parseSwpcAlert(alert);
  const typeColor = EVENT_TYPE_COLORS[p.eventType] || '#f87171';

  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: `${typeColor}08`,
      border: `1px solid ${typeColor}22`,
    }}>
      {/* Badges + timestamp + NOAA link */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 9, padding: '2px 7px', borderRadius: 4,
          background: `${typeColor}22`, border: `1px solid ${typeColor}55`,
          color: typeColor, fontFamily: "'DM Mono', monospace",
          letterSpacing: '0.1em', fontWeight: 700,
        }}>{p.eventType}</span>

        {p.scale && (
          <span style={{
            fontSize: 9, padding: '2px 7px', borderRadius: 4,
            background: `${noaaScaleColor(p.scale)}20`,
            border: `1px solid ${noaaScaleColor(p.scale)}50`,
            color: noaaScaleColor(p.scale),
            fontFamily: "'DM Mono', monospace", fontWeight: 700,
          }}>{p.scale}</span>
        )}

        {alert.issued_at && (
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: "'DM Mono', monospace" }}>
            {new Date(alert.issued_at).toLocaleString('en-GB', {
              month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit', hour12: false,
            })}
          </span>
        )}

        <a
          href={p.noaaUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginLeft: 'auto',
            fontSize: 9, padding: '2px 7px', borderRadius: 4,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.35)',
            fontFamily: "'DM Mono', monospace",
            textDecoration: 'none',
            letterSpacing: '0.05em',
            transition: 'color 0.15s, border-color 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = typeColor; e.currentTarget.style.borderColor = `${typeColor}55`; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
        >↗ NOAA</a>
      </div>

      {/* Type label + event text */}
      <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.55, marginBottom: p.impact ? 5 : 0 }}>
        <span style={{ color: typeColor, fontWeight: 700 }}>{p.typeLabel}</span>
        {p.eventText && (
          <span style={{ color: 'var(--muted)' }}> · {p.eventText}</span>
        )}
      </div>

      {/* Impact */}
      {p.impact && (
        <div style={{ fontSize: 10.5, color: 'rgba(226,232,240,0.45)', lineHeight: 1.5, marginTop: 4 }}>
          {p.impact}
        </div>
      )}
    </div>
  );
}

function AuroraVisibility({ lat, kp, city }) {
  if (lat == null || kp == null) return null;

  const absLat = Math.abs(lat);
  const hemi = lat >= 0 ? 'N' : 'S';
  const requiredKp = getRequiredKp(absLat);
  const auroraReachLat = getAuroraReachLat(kp);
  const diff = kp - requiredKp;

  const visible = diff >= 0;
  const borderline = !visible && diff >= -1.5;
  const status = visible ? 'VISIBLE' : borderline ? 'BORDERLINE' : 'UNLIKELY';
  const statusColor = visible ? '#4ade80' : borderline ? '#fbbf24' : '#f87171';

  const statusDesc = visible
    ? `Aurora is reaching down to ${auroraReachLat}° — your location is inside the oval.`
    : borderline
    ? `Aurora reaching ${auroraReachLat}°. Just ${(-diff).toFixed(1)} more Kp and you're in.`
    : `Aurora reaching ${auroraReachLat}°. Your latitude requires Kp ${requiredKp}+.`;

  const svgH = 160;
  const svgW = 160;
  const cx = svgW / 2;
  const latToY = (l) => svgH * (1 - l / 90);
  const userY = latToY(absLat);
  const auroraEdgeY = Math.min(latToY(auroraReachLat), svgH);
  const kpPct = Math.min((kp / Math.max(requiredKp === 10 ? 9 : requiredKp, 1)) * 100, 100);

  return (
    <div className="card span3" style={{
      padding: '28px 32px',
      background: visible
        ? 'linear-gradient(135deg, rgba(74,222,128,0.06) 0%, var(--glass) 60%)'
        : borderline
        ? 'linear-gradient(135deg, rgba(251,191,36,0.06) 0%, var(--glass) 60%)'
        : 'linear-gradient(135deg, rgba(248,113,113,0.04) 0%, var(--glass) 60%)',
      borderColor: visible
        ? 'rgba(74,222,128,0.3)'
        : borderline
        ? 'rgba(251,191,36,0.25)'
        : 'rgba(248,113,113,0.2)',
    }}>
      <div className="card-label" style={{ marginBottom: 20 }}>
        <span className="dot" style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
        Aurora Visibility · {city ? city.split(',')[0] : 'Your Location'}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 4vw, 36px)', flexWrap: 'wrap' }}>
        {/* Status + progress */}
        <div style={{ flex: 1, minWidth: 'min(220px, 100%)' }}>
          <div style={{
            fontSize: 52, fontFamily: "'Syne', sans-serif", fontWeight: 700,
            color: statusColor, letterSpacing: '-0.02em', lineHeight: 1,
            filter: `drop-shadow(0 0 28px ${statusColor}55)`,
          }}>{status}</div>
          <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.9, color: 'var(--muted)' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", color: 'var(--text)', fontSize: 13, marginBottom: 2 }}>
              {absLat.toFixed(2)}°{hemi} · {city || 'Unknown location'}
            </div>
            <div>{statusDesc}</div>
          </div>
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              <span>Kp Progress to Threshold</span>
              <span style={{ color: statusColor }}>{kp.toFixed(1)} / {requiredKp >= 10 ? '>9' : requiredKp}</span>
            </div>
            <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${kpPct}%`,
                background: `linear-gradient(90deg, ${statusColor}66, ${statusColor})`,
                borderRadius: 3,
                transition: 'width 1.2s ease',
                boxShadow: `0 0 10px ${statusColor}88`,
              }} />
            </div>
          </div>
        </div>

        {/* SVG latitude diagram */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)', fontFamily: "'DM Mono', monospace" }}>POLE</div>
          <svg width={svgW} height={svgH} style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="av-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7ee8fa" stopOpacity="0.95" />
                <stop offset="55%" stopColor="#4ade80" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect x={cx - 5} y={0} width={10} height={svgH} rx={5} fill="rgba(255,255,255,0.05)" />
            <rect x={cx - 5} y={0} width={10} height={auroraEdgeY} rx={5} fill="url(#av-fill)"
              style={{ filter: 'drop-shadow(0 0 8px rgba(126,232,250,0.5))' }} />
            {[90, 70, 50, 30, 10].map(l => {
              const y = latToY(l);
              return (
                <g key={l}>
                  <line x1={cx - 11} y1={y} x2={cx + 11} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
                  <text x={cx + 15} y={y + 3.5} fill="rgba(255,255,255,0.22)" fontSize={8.5} fontFamily="'DM Mono', monospace">{l}°</text>
                </g>
              );
            })}
            <line x1={cx - 18} y1={auroraEdgeY} x2={cx + 18} y2={auroraEdgeY}
              stroke="#4ade80" strokeWidth={1} strokeDasharray="4 3" opacity={0.75} />
            <text x={cx - 22} y={auroraEdgeY + 3.5} fill="#4ade80" fontSize={8.5}
              fontFamily="'DM Mono', monospace" textAnchor="end" opacity={0.85}>{auroraReachLat}°</text>
            <circle cx={cx} cy={userY} r={14} fill={statusColor} opacity={0.08} />
            <circle cx={cx} cy={userY} r={8} fill={statusColor} opacity={0.15} />
            <circle cx={cx} cy={userY} r={4} fill={statusColor}
              style={{ filter: `drop-shadow(0 0 8px ${statusColor})` }} />
            <text x={cx - 20} y={userY + 3.5} fill={statusColor} fontSize={8.5}
              fontFamily="'DM Mono', monospace" textAnchor="end" fontWeight="700">
              {absLat.toFixed(0)}°{hemi}
            </text>
          </svg>
          <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)', fontFamily: "'DM Mono', monospace" }}>EQ</div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 16, flexShrink: 0, minWidth: 0 }}>
          {[
            { label: 'Current Kp',   value: kp.toFixed(1), color: KP_COLOR(kp) },
            { label: 'Min Required', value: requiredKp >= 10 ? '> 9' : `${requiredKp}.0`, color: 'var(--text)' },
            { label: diff >= 0 ? 'Kp Surplus' : 'Kp Deficit', value: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}`, color: statusColor },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontFamily: "'DM Mono', monospace", fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AuroraPage({ onNavigate, weatherCity, weatherLat }) {
  const { data, status } = useSpaceWeather();

  const latestKp   = data?.kp?.[0]?.magnitude ?? null;
  const latestWind = data?.solar_wind?.[0];
  const alerts     = data?.alerts ?? [];

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
          {weatherCity && (
            <div style={{ fontSize: 11, color: 'var(--accent)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.08em' }}>
              📍 {weatherCity}
            </div>
          )}
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
            <div className="grid">

              {/* Kp gauge */}
              <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                {latestKp != null
                  ? <KpGauge kp={latestKp} />
                  : <span style={{ color: 'var(--muted)' }}>No data</span>}
              </div>

              {/* Solar wind */}
              <div className="card">
                <div className="card-label">
                  <span className="dot" style={{ background: '#fb923c', boxShadow: '0 0 6px #fb923c' }} />
                  Solar Wind
                </div>
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
                <div className="card-label">
                  <span className="dot" style={{ background: '#a78bfa', boxShadow: '0 0 6px #a78bfa' }} />
                  Space Weather Alerts
                </div>
                {alerts.length === 0 ? (
                  <div style={{ color: 'var(--success)', fontSize: 13, marginTop: 8 }}>✓ No active alerts</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, maxHeight: 260, overflowY: 'auto' }}>
                    {alerts.slice(0, 6).map((a, i) => (
                      <AlertCard key={i} alert={a} />
                    ))}
                  </div>
                )}
              </div>

              {/* Aurora visibility (only when city is selected) */}
              {weatherLat != null && latestKp != null && (
                <AuroraVisibility lat={weatherLat} kp={latestKp} city={weatherCity} />
              )}

              {/* Kp history bar chart — KpBar owns its own range state */}
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
