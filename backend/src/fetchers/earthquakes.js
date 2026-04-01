import fetch from 'node-fetch';
import { config } from '../config.js';
import { upsertEvent, saveRawPayload, updateSourceStatus } from '../db.js';

const PROVIDER = 'usgs';

function normalize(feature) {
  const p = feature.properties;
  const [lon, lat, depth] = feature.geometry.coordinates;
  return {
    provider: PROVIDER,
    provider_event_id: feature.id,
    event_type: 'earthquake',
    timestamp: new Date(p.time).toISOString(),
    latitude: lat,
    longitude: lon,
    depth: depth ?? null,
    magnitude: p.mag ?? null,
    severity: severityFromMag(p.mag),
    title: p.title || `M${p.mag} earthquake`,
    summary: p.place || null,
    source_confidence: 1.0,
    raw_json: feature,
  };
}

function severityFromMag(mag) {
  if (mag == null) return 'unknown';
  if (mag >= 7.0) return 'major';
  if (mag >= 5.0) return 'moderate';
  if (mag >= 3.0) return 'minor';
  return 'micro';
}

export async function fetchEarthquakes() {
  try {
    const res = await fetch(config.providers.earthquakes.feedUrl, { timeout: 10000 });
    if (!res.ok) throw new Error(`USGS responded ${res.status}`);
    const data = await res.json();

    await saveRawPayload(PROVIDER, config.providers.earthquakes.feedUrl, data);

    let count = 0;
    for (const feature of data.features) {
      await upsertEvent(normalize(feature));
      count++;
    }

    await updateSourceStatus(PROVIDER, 'ok');
    console.log(`[earthquakes] upserted ${count} events`);
  } catch (err) {
    console.error('[earthquakes] fetch error:', err.message);
    await updateSourceStatus(PROVIDER, 'error').catch(() => {});
  }
}
