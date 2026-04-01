import fetch from 'node-fetch';
import { config } from '../config.js';
import { upsertEvent, upsertAlert, saveRawPayload, updateSourceStatus } from '../db.js';

const PROVIDER = 'noaa_swpc';
const { spaceWeather: cfg } = config.providers;

function cleanJson(obj) {
  return JSON.parse(JSON.stringify(obj));
}

async function fetchJson(url) {
  const res = await fetch(url, { timeout: 10000 });
  if (!res.ok) throw new Error(`SWPC ${url} responded ${res.status}`);
  return res.json();
}

function kpSeverity(kp) {
  if (kp >= 8) return 'extreme';
  if (kp >= 6) return 'severe';
  if (kp >= 5) return 'strong';
  if (kp >= 4) return 'moderate';
  return 'minor';
}

async function ingestKp() {
  const data = await fetchJson(cfg.kpUrl);
  await saveRawPayload(PROVIDER, cfg.kpUrl, data);

  // data is an array of [time_tag, kp, status] entries
  for (const entry of data.slice(-10)) {
    const [time_tag, kp] = Array.isArray(entry) ? entry : [entry.time_tag, entry.kp_index];
    if (kp == null) continue;
    const kpVal = parseFloat(kp);
    await upsertEvent({
      provider: PROVIDER,
      provider_event_id: `kp_${time_tag}`,
      event_type: 'kp_index',
      timestamp: new Date(time_tag).toISOString(),
      latitude: null,
      longitude: null,
      depth: null,
      magnitude: kpVal,
      severity: kpSeverity(kpVal),
      title: `Kp Index: ${kpVal}`,
      summary: `Planetary K-index reading of ${kpVal} at ${time_tag}`,
      source_confidence: 1.0,
      raw_json: cleanJson({ time_tag, kp: kpVal }),
    });
  }
}

async function ingestAlerts() {
  const data = await fetchJson(cfg.alertsUrl);
  await saveRawPayload(PROVIDER, cfg.alertsUrl, data);

  for (const item of data) {
    const id = `alert_${item.issue_datetime}_${(item.message || '').slice(0, 20).replace(/\W/g, '_')}`;
    await upsertAlert({
      provider: PROVIDER,
      provider_alert_id: id,
      alert_type: 'space_weather',
      severity: item.message?.toLowerCase().includes('warning') ? 'warning' : 'watch',
      title: (item.message || '').split('\n')[0].trim().slice(0, 200),
      summary: item.message || null,
      area: 'global',
      issued_at: (() => { try { return item.issue_datetime ? new Date(item.issue_datetime).toISOString() : null; } catch { return null; } })(),
      expires_at: null,
      raw_json: cleanJson(item),
    });
  }
}

async function ingestSolarWind() {
  const data = await fetchJson(cfg.solarWindUrl);
  await saveRawPayload(PROVIDER, cfg.solarWindUrl, data);

  const recent = Array.isArray(data) ? data.slice(-5) : [];
  for (const entry of recent) {
    const time = entry.time_tag;
    if (!time) continue;
    await upsertEvent({
      provider: PROVIDER,
      provider_event_id: `solarwind_${time}`,
      event_type: 'solar_wind',
      timestamp: new Date(time).toISOString(),
      latitude: null,
      longitude: null,
      depth: null,
      magnitude: entry.speed ?? null,
      severity: entry.speed > 700 ? 'high' : entry.speed > 500 ? 'moderate' : 'low',
      title: `Solar wind ${entry.speed ? Math.round(entry.speed) + ' km/s' : 'reading'}`,
      summary: `Bt: ${entry.bt ?? '?'} nT, Bz: ${entry.bz_gsm ?? '?'} nT`,
      source_confidence: 1.0,
      raw_json: cleanJson(entry),
    });
  }
}

export async function fetchSpaceWeather() {
  try {
    await Promise.all([ingestKp(), ingestAlerts(), ingestSolarWind()]);
    await updateSourceStatus(PROVIDER, 'ok');
    console.log('[space-weather] ingested kp, alerts, solar wind');
  } catch (err) {
    console.error('[space-weather] fetch error:', err.message);
    await updateSourceStatus(PROVIDER, 'error').catch(() => {});
  }
}
