import { useState, useRef, useEffect } from 'react';
import { weatherEmoji, convertTemp, tempSymbol } from '../utils/weather';

export function ForecastCard({ days, unit }) {
  const sym = tempSymbol(unit);
  return (
    <div className="card span2" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column' }}>
      <div className="card-label"><span className="dot" />&nbsp;5-Day Forecast</div>
      <div className="forecast-row" style={{ flex: 1 }}>
        {Object.entries(days).slice(0, 6).map(([day, d]) => (
          <div className="fcast-day" key={day}>
            <div className="fcast-dow">{day}</div>
            <div className="fcast-icon">{weatherEmoji(d.icon.main, d.icon.description)}</div>
            <div className="fcast-hi">{convertTemp(Math.max(...d.temps), unit)}{sym}</div>
            <div className="fcast-lo">{convertTemp(Math.min(...d.temps), unit)}{sym}</div>
            <div className="fcast-pop">💧 {Math.round(Math.max(...d.pops) * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const VISIBLE = 8;

export function HourlyCarousel({ hourly, unit }) {
  const [page, setPage] = useState(0);
  const trackRef = useRef(null);
  const sym = tempSymbol(unit);
  const pages = Math.ceil(hourly.length / VISIBLE);

  useEffect(() => { setPage(0); }, [hourly]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const outer = track.parentElement;
    const gap = 8;
    const cellW = (outer.clientWidth - gap * (VISIBLE - 1)) / VISIBLE;
    track.style.transform = `translateX(-${page * (cellW + gap) * VISIBLE}px)`;
  }, [page]);

  const startIdx = page * VISIBLE;
  const endIdx = Math.min(startIdx + VISIBLE - 1, hourly.length - 1);

  function timeLabel(dt) {
    const d = new Date(dt * 1000);
    const hr = d.getHours();
    return hr === 0 ? '12a' : hr < 12 ? `${hr}a` : hr === 12 ? '12p' : `${hr - 12}p`;
  }

  function startLabel() {
    const d = new Date(hourly[startIdx]?.dt * 1000);
    const hr = d.getHours();
    return hr === 0 ? '12a' : hr < 12 ? `${hr}a` : hr === 12 ? '12p' : `${hr - 12}p`;
  }
  function endLabel() {
    const d = new Date(hourly[endIdx]?.dt * 1000);
    const hr = d.getHours();
    return hr === 0 ? '12a' : hr < 12 ? `${hr}a` : hr === 12 ? '12p' : `${hr - 12}p`;
  }

  return (
    <div className="card span3" id="hourlyCard" style={{ display: 'flex', flexDirection: 'column', minHeight: 220 }}>
      <div className="card-label"><span className="dot" style={{ background: 'var(--accent2)' }} />&nbsp;48-Hour Forecast</div>
      <div className="carousel-wrap">
        <div className="carousel-track-outer">
          <div className="carousel-track" ref={trackRef}>
            {hourly.map((h, i) => (
              <div className="hour-cell" key={i}>
                <div className="hour-time">{timeLabel(h.dt)}</div>
                <div className="hour-icon">{weatherEmoji(h.weather[0].main, h.weather[0].description)}</div>
                <div className="hour-temp">{convertTemp(h.main.temp, unit)}{sym}</div>
                <div className="hour-rain">💧{Math.round((h.pop || 0) * 100)}%</div>
              </div>
            ))}
          </div>
        </div>
        <div className="carousel-nav">
          <button className="carousel-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>&#8592;</button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div className="carousel-dots">
              {Array.from({ length: pages }, (_, i) => (
                <div key={i} className={`c-dot${i === page ? ' active' : ''}`} onClick={() => setPage(i)} />
              ))}
            </div>
            <div className="carousel-range-label">{startLabel()} — {endLabel()}</div>
          </div>
          <button className="carousel-btn" onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}>&#8594;</button>
        </div>
      </div>
    </div>
  );
}
