import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// Unified feed
router.get('/feed', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const { rows } = await pool.query(
      `SELECT * FROM events ORDER BY timestamp DESC LIMIT $1`, [limit]
    );
    res.json({ ok: true, count: rows.length, events: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Earthquakes — GeoJSON compatible
router.get('/earthquakes', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 200, 500);
    const minMag = parseFloat(req.query.min_magnitude) || 0;
    const { rows } = await pool.query(
      `SELECT * FROM events
       WHERE provider = 'usgs' AND event_type = 'earthquake'
         AND ($1::float = 0 OR magnitude >= $1::float)
       ORDER BY timestamp DESC LIMIT $2`,
      [minMag, limit]
    );
    const features = rows.map(r => ({
      type: 'Feature',
      id: r.provider_event_id,
      geometry: r.latitude != null
        ? { type: 'Point', coordinates: [r.longitude, r.latitude, r.depth] }
        : null,
      properties: {
        provider: r.provider,
        timestamp: r.timestamp,
        magnitude: r.magnitude,
        depth: r.depth,
        severity: r.severity,
        title: r.title,
        summary: r.summary,
      },
    }));
    res.json({ type: 'FeatureCollection', count: features.length, features });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Space weather
router.get('/space-weather', async (req, res) => {
  try {
    const kpHours = Math.min(Math.max(parseInt(req.query.kp_hours) || 24, 1), 8760);

    // Two-part query so GFZ historical data isn't buried under 1-min accumulation:
    // Part 1 — recent 24h at full 1-min resolution (up to ~1440 rows, no cap)
    const { rows: kpRecent } = await pool.query(
      `SELECT * FROM events WHERE provider = 'noaa_swpc' AND event_type = 'kp_index'
         AND timestamp >= NOW() - INTERVAL '24 hours'
       ORDER BY timestamp DESC`,
    );
    // Part 2 — historical data older than 24h, up to the requested range (3-hourly GFZ/NOAA)
    let kpHistory = [];
    if (kpHours > 24) {
      const { rows } = await pool.query(
        `SELECT * FROM events WHERE provider = 'noaa_swpc' AND event_type = 'kp_index'
           AND timestamp < NOW() - INTERVAL '24 hours'
           AND timestamp >= NOW() - ($1 * INTERVAL '1 hour')
         ORDER BY timestamp DESC LIMIT 500`,
        [kpHours]
      );
      kpHistory = rows;
    }
    const kp = [...kpRecent, ...kpHistory];
    const { rows: solarWind } = await pool.query(
      `SELECT * FROM events WHERE provider = 'noaa_swpc' AND event_type = 'solar_wind'
       ORDER BY timestamp DESC LIMIT 10`
    );
    const { rows: alerts } = await pool.query(
      `SELECT * FROM hazard_alerts WHERE provider = 'noaa_swpc'
       ORDER BY issued_at DESC LIMIT 20`
    );
    res.json({ ok: true, kp, solar_wind: solarWind, alerts });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Source health
router.get('/status', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT name, status, last_fetched_at FROM sources ORDER BY name`
    );
    const sources = {};
    for (const row of rows) sources[row.name] = { status: row.status, last_fetched_at: row.last_fetched_at };
    res.json({ ok: true, sources });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
