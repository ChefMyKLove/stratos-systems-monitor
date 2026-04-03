import fetch from 'node-fetch';
import { config } from '../config.js';
import { upsertEvent, upsertAlert, saveRawPayload, updateSourceStatus } from '../db.js';

const PROVIDER = 'noaa_swpc';
const { spaceWeather: cfg } = config.providers;

function cleanJson(obj) {
  return JSON.parse(JSON.stringify(obj));
}

async function fetchJson(url) {
  const res = await fetch(url, { timeout: 15000 });
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

// NOAA timestamps are UTC but often omit the 'Z' suffix.
// Without 'Z', new Date() treats the string as LOCAL time — wrong on any non-UTC server.
// This helper forces UTC parsing regardless of whether the source includes 'Z'.
function toUtcIso(ts) {
  if (!ts) return null;
  const hasZone = ts.endsWith('Z') || ts.includes('+') || /[+-]\d{2}:\d{2}$/.test(ts);
  return new Date(hasZone ? ts : ts + 'Z').toISOString();
}

// Shared upsert logic — handles NOAA array/object format and GFZ object format
async function upsertKpEntries(entries) {
  for (const entry of entries) {
    const [time_tag, kp] = Array.isArray(entry) ? entry : [entry.time_tag, entry.Kp ?? entry.kp_index];
    if (!time_tag || time_tag === 'time_tag') continue; // skip header rows
    if (kp == null || kp === '' || isNaN(parseFloat(kp))) continue;
    const kpVal = parseFloat(kp);
    const isoTs = toUtcIso(time_tag);
    if (!isoTs) continue;
    await upsertEvent({
      provider: PROVIDER,
      // Keep original time_tag in the ID (no Z normalization) so ON CONFLICT
      // correctly upserts old incorrectly-stored entries with the fixed timestamp.
      provider_event_id: `kp_${time_tag}`,
      event_type: 'kp_index',
      timestamp: isoTs,
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

// NOAA 1-min feed — rolling ~24h window, high resolution
async function ingestKp() {
  const data = await fetchJson(cfg.kpUrl);
  await saveRawPayload(PROVIDER, cfg.kpUrl, data);
  await upsertKpEntries(Array.isArray(data) ? data : []);
}

// NOAA 3-day feed — 3h resolution, covers 72h
async function ingestKp3day() {
  const data = await fetchJson(cfg.kp3dayUrl);
  await saveRawPayload(PROVIDER, cfg.kp3dayUrl, data);
  await upsertKpEntries(Array.isArray(data) ? data : []);
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

// Regular cycle every 10 min
export async function fetchSpaceWeather() {
  try {
    await Promise.all([ingestKp(), ingestKp3day(), ingestAlerts(), ingestSolarWind()]);
    await updateSourceStatus(PROVIDER, 'ok');
    console.log('[space-weather] ingested kp (1m + 3day), alerts, solar wind');
  } catch (err) {
    console.error('[space-weather] fetch error:', err.message);
    await updateSourceStatus(PROVIDER, 'error').catch(() => {});
  }
}

// One-time 30-day backfill from GFZ (kp.gfz.de)
// API: GET /app/json/?start=YYYY-MM-DDThh:mm:ssZ&end=...&index=Kp
// Response: { datetime: [...ISO strings...], Kp: [...floats...], status: [...] }
export async function backfillKp30day() {
  try {
    const end   = new Date();
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fmt   = (d) => d.toISOString().slice(0, 19) + 'Z';

    const url = `${cfg.kp30dayBaseUrl}?start=${fmt(start)}&end=${fmt(end)}&index=Kp`;
    console.log(`[space-weather] GFZ backfill: ${url}`);

    const data = await fetchJson(url);

    const datetimes = data.datetime ?? [];
    const kpValues  = data.Kp ?? [];

    if (!datetimes.length) {
      console.error(`[space-weather] GFZ backfill: unexpected response. Keys: ${Object.keys(data).join(', ')}`);
      return;
    }

    const entries = datetimes.map((time_tag, i) => [time_tag, kpValues[i]]);
    await upsertKpEntries(entries);

    const oldest = datetimes[0];
    const newest = datetimes[datetimes.length - 1];
    console.log(`[space-weather] GFZ backfill complete — ${entries.length} readings (${oldest} → ${newest})`);
  } catch (err) {
    console.error('[space-weather] 30-day backfill error:', err.message);
  }
}
