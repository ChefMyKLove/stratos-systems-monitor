import { useState, useEffect } from 'react';
import { useHistoricalWeather } from '../hooks/useHistoricalWeather';
import { convertTemp, tempSymbol, wmoCodeEmoji, extractDayAcrossYears, summarizeDayHistory } from '../utils/weather';

const CANON_LEAP_YEAR = 2024; // lets the day-cursor land on Feb 29 without special-casing

function todayCursor() {
  const d = new Date();
  d.setFullYear(CANON_LEAP_YEAR);
  return d;
}

function isToday(cursor) {
  const now = new Date();
  return cursor.getMonth() === now.getMonth() && cursor.getDate() === now.getDate();
}

function fmtMonthDay(cursor) {
  return cursor.toLocaleDateString('en', { month: 'long', day: 'numeric' });
}

export default function HistoricalWeatherModal({ isOpen, onClose, lat, lon, locationName, unit }) {
  const { status, error, data, load } = useHistoricalWeather();
  const [cursor, setCursor] = useState(todayCursor);
  const [wasOpen, setWasOpen] = useState(isOpen);

  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setCursor(todayCursor());
  }

  useEffect(() => {
    if (isOpen && lat != null && lon != null) load(lat, lon);
  }, [isOpen, lat, lon, load]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    function onKeyDown(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sym = tempSymbol(unit);
  const rows = data ? extractDayAcrossYears(data, cursor.getMonth() + 1, cursor.getDate()) : [];
  const summary = data ? summarizeDayHistory(rows) : null;

  function step(deltaDays) {
    setCursor(c => {
      const next = new Date(c);
      next.setDate(next.getDate() + deltaDays);
      return next;
    });
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-panel">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="card-label"><span className="dot" style={{ background: 'var(--accent2)', boxShadow: '0 0 6px var(--accent2)' }} />&nbsp;On This Day{locationName ? ` · ${locationName}` : ''}</div>

        <div className="day-stepper">
          <button className="carousel-btn" onClick={() => step(-1)} aria-label="Previous day">&#8592;</button>
          <div className="day-stepper-label">{fmtMonthDay(cursor)}</div>
          <button className="carousel-btn" onClick={() => step(1)} aria-label="Next day">&#8594;</button>
          {!isToday(cursor) && <button className="btn" onClick={() => setCursor(todayCursor())}>Today</button>}
        </div>

        {status === 'loading' && (
          <div className="hist-msg">
            <div className="spinner" />
            <p>Loading weather history…</p>
          </div>
        )}
        {status === 'error' && <p className="hist-msg hist-error">⚠ {error}</p>}

        {status === 'success' && summary && (
          <>
            <div className="hist-summary">
              <div className="stat"><div className="stat-val" style={{ color: 'var(--danger)' }}>{convertTemp(summary.recordHigh.tempMax, unit)}{sym}</div><div className="stat-key">Record High · {summary.recordHigh.year}</div></div>
              <div className="stat"><div className="stat-val" style={{ color: '#60a5fa' }}>{convertTemp(summary.recordLow.tempMin, unit)}{sym}</div><div className="stat-key">Record Low · {summary.recordLow.year}</div></div>
              <div className="stat"><div className="stat-val" style={{ color: 'var(--warm)' }}>{convertTemp(summary.avgHigh, unit)}{sym}</div><div className="stat-key">Avg High</div></div>
              <div className="stat"><div className="stat-val" style={{ color: 'var(--muted)', fontSize: 14 }}>{summary.years} yrs</div><div className="stat-key">Of Data</div></div>
            </div>

            <div className="hist-year-list">
              {rows.map(r => (
                <div
                  className={`hist-year-row${r.year === summary.recordHigh.year ? ' record-high' : ''}${r.year === summary.recordLow.year ? ' record-low' : ''}`}
                  key={r.date}
                >
                  <div className="hist-year-num">{r.year}</div>
                  <div className="hist-year-icon">{wmoCodeEmoji(r.weathercode)}</div>
                  <div className="hist-year-hi">{convertTemp(r.tempMax, unit)}{sym}</div>
                  <div className="hist-year-lo">{convertTemp(r.tempMin, unit)}{sym}</div>
                  <div className="hist-year-precip">{r.precip > 0 ? `💧${r.precip.toFixed(1)}mm` : ''}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
