import fetch from 'node-fetch';
import { config } from '../config.js';
import { pool, upsertAlert, saveRawPayload, updateSourceStatus } from '../db.js';

const PROVIDER_METEO = 'open_meteo';
const PROVIDER_NWS = 'noaa_nws';
const { weather: cfg } = config.providers;

async function fetchOpenMeteo(location) {
  const params = new URLSearchParams({
    latitude: location.lat,
    longitude: location.lon,
    current: [
      'temperature_2m', 'wind_speed_10m', 'wind_direction_10m',
      'precipitation', 'surface_pressure', 'relative_humidity_2m',
      'weather_code',
    ].join(','),
    wind_speed_unit: 'ms',
    timezone: 'UTC',
  });

  const url = `${cfg.openMeteoUrl}?${params}`;
  const res = await fetch(url, { timeout: 10000 });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status} for ${location.name}`);
  const data = await res.json();

  await saveRawPayload(PROVIDER_METEO, url, data);

  const cur = data.current;
  await pool.query(
    `INSERT INTO weather_snapshots
      (location_name, latitude, longitude, provider, timestamp,
       temperature_c, wind_speed_ms, wind_direction_deg,
       precipitation_mm, pressure_hpa, humidity_pct, condition_code, raw_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      location.name, location.lat, location.lon,
      PROVIDER_METEO, new Date(cur.time).toISOString(),
      cur.temperature_2m, cur.wind_speed_10m, cur.wind_direction_10m,
      cur.precipitation, cur.surface_pressure, cur.relative_humidity_2m,
      String(cur.weather_code), data,
    ]
  );

  console.log(`[weather] snapshot saved for ${location.name}`);
}

async function fetchNwsAlerts() {
  const res = await fetch(cfg.nwsAlertsUrl, {
    headers: { 'User-Agent': 'stratos-backend/1.0 (contact@example.com)' },
    timeout: 10000,
  });
  if (!res.ok) throw new Error(`NWS alerts responded ${res.status}`);
  const data = await res.json();

  await saveRawPayload(PROVIDER_NWS, cfg.nwsAlertsUrl, data);

  let count = 0;
  for (const feature of (data.features || [])) {
    const p = feature.properties;
    await upsertAlert({
      provider: PROVIDER_NWS,
      provider_alert_id: p.id || feature.id,
      alert_type: p.event || 'weather_alert',
      severity: (p.severity || 'unknown').toLowerCase(),
      title: p.headline || p.event || 'Weather Alert',
      summary: p.description || null,
      area: p.areaDesc || null,
      issued_at: p.sent ? new Date(p.sent).toISOString() : null,
      expires_at: p.expires ? new Date(p.expires).toISOString() : null,
      raw_json: feature,
    });
    count++;
  }
  console.log(`[weather] upserted ${count} NWS alerts`);
}

export async function fetchWeather() {
  try {
    await Promise.all(cfg.locations.map(fetchOpenMeteo));
    await fetchNwsAlerts();
    await updateSourceStatus(PROVIDER_METEO, 'ok');
    await updateSourceStatus(PROVIDER_NWS, 'ok');
  } catch (err) {
    console.error('[weather] fetch error:', err.message);
    await updateSourceStatus(PROVIDER_METEO, 'error').catch(() => {});
  }
}
