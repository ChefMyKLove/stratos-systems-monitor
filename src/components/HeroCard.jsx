import { convertTemp, tempSymbol, weatherEmoji } from '../utils/weather';

export default function HeroCard({ cur, unit, onSave }) {
  const w = cur.weather[0];
  const emoji = weatherEmoji(w.main, w.description);
  const tMin = cur.main.temp_min, tMax = cur.main.temp_max;
  const tRange = tMax - tMin || 1;
  const tPct = ((cur.main.feels_like - tMin) / tRange * 100).toFixed(0);
  const sym = tempSymbol(unit);

  return (
    <div className="card hero-card">
      <button className="save-btn" onClick={onSave}>＋ Save Location</button>
      <div className="card-label"><span className="dot" />&nbsp;Current Conditions</div>
      <div className="hero-location">{cur.name}</div>
      <div className="hero-country">
        {cur.sys.country} · {cur.coord?.lat?.toFixed(2)}°N, {Math.abs(cur.coord?.lon?.toFixed(2))}°{cur.coord?.lon >= 0 ? 'E' : 'W'}
      </div>
      <div className="hero-temp-row">
        <div className="hero-temp">{convertTemp(cur.main.temp, unit)}{sym}</div>
        <div className="hero-meta">
          <div className="hero-desc">{w.description}</div>
          <div className="hero-feels">Feels like {convertTemp(cur.main.feels_like, unit)}{sym}</div>
          <div className="temp-range" style={{ marginTop: 10, maxWidth: 200 }}>
            <span className="temp-lo">{convertTemp(tMin, unit)}{sym}</span>
            <div className="temp-range-bar">
              <div className="temp-range-marker" style={{ left: `${tPct}%` }} />
            </div>
            <span className="temp-hi">{convertTemp(tMax, unit)}{sym}</span>
          </div>
        </div>
        <div className="hero-icon" style={{ marginLeft: 'auto', fontSize: 72, filter: 'drop-shadow(0 0 20px rgba(126,232,250,0.3))' }}>
          {emoji}
        </div>
      </div>
    </div>
  );
}
