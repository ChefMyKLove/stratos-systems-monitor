import { Router } from 'express';
import fetch from 'node-fetch';
import { config } from '../config.js';

const router = Router();
const OWM_BASE = 'https://api.openweathermap.org';
const ARCHIVE_BASE = 'https://archive-api.open-meteo.com/v1/archive';
const HISTORICAL_MIN_DATE = '1940-01-01';

function latestHistoricalDate() {
  const d = new Date();
  d.setDate(d.getDate() - 5);
  return d.toISOString().slice(0, 10);
}

router.get('/current', async (req, res) => {
  try {
    const key = config.openWeatherMapApiKey;
    if (!key) throw new Error('Weather provider not configured on the server.');

    const { city, lat, lon } = req.query;
    let curUrl, foreUrl;
    if (city) {
      curUrl = `${OWM_BASE}/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${key}&units=metric`;
      foreUrl = `${OWM_BASE}/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${key}&units=metric`;
    } else if (lat != null && lon != null) {
      curUrl = `${OWM_BASE}/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}&units=metric`;
      foreUrl = `${OWM_BASE}/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${key}&units=metric`;
    } else {
      return res.status(400).json({ ok: false, error: 'Provide either city or lat/lon.' });
    }

    const [cur, fore] = await Promise.all([
      fetch(curUrl).then(r => r.json()),
      fetch(foreUrl).then(r => r.json()),
    ]);
    if (Number(cur.cod) !== 200) {
      return res.status(404).json({ ok: false, error: `City not found${city ? `: "${city}"` : ''}` });
    }

    const aqi = await fetch(`${OWM_BASE}/data/2.5/air_pollution?lat=${cur.coord.lat}&lon=${cur.coord.lon}&appid=${key}`)
      .then(r => r.json()).catch(() => null);

    res.json({ cur, fore, aqi });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/geocode', async (req, res) => {
  try {
    const key = config.openWeatherMapApiKey;
    if (!key) throw new Error('Weather provider not configured on the server.');
    const { q } = req.query;
    if (!q) return res.json([]);
    const results = await fetch(`${OWM_BASE}/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=6&appid=${key}`).then(r => r.json());
    res.json(results);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (lat == null || lon == null) return res.status(400).json({ ok: false, error: 'lat and lon are required.' });

    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      start_date: HISTORICAL_MIN_DATE,
      end_date: latestHistoricalDate(),
      daily: ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'weathercode'].join(','),
      timezone: 'auto',
    });
    const data = await fetch(`${ARCHIVE_BASE}?${params}`).then(r => r.json());
    if (!data.daily) throw new Error('No historical data returned for this location.');
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
