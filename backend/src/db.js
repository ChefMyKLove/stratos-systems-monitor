import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = new Pool({ connectionString: config.databaseUrl });

export async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS sources (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        url TEXT,
        last_fetched_at TIMESTAMPTZ,
        status TEXT DEFAULT 'unknown',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        provider TEXT NOT NULL,
        provider_event_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        depth DOUBLE PRECISION,
        magnitude DOUBLE PRECISION,
        severity TEXT,
        title TEXT,
        summary TEXT,
        source_confidence REAL DEFAULT 1.0,
        raw_json JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(provider, provider_event_id)
      );

      CREATE TABLE IF NOT EXISTS weather_snapshots (
        id SERIAL PRIMARY KEY,
        location_name TEXT NOT NULL,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        provider TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        temperature_c DOUBLE PRECISION,
        wind_speed_ms DOUBLE PRECISION,
        wind_direction_deg INTEGER,
        precipitation_mm DOUBLE PRECISION,
        pressure_hpa DOUBLE PRECISION,
        humidity_pct INTEGER,
        condition_code TEXT,
        raw_json JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hazard_alerts (
        id SERIAL PRIMARY KEY,
        provider TEXT NOT NULL,
        provider_alert_id TEXT,
        alert_type TEXT NOT NULL,
        severity TEXT,
        title TEXT,
        summary TEXT,
        area TEXT,
        issued_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        raw_json JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(provider, provider_alert_id)
      );

      CREATE TABLE IF NOT EXISTS raw_payloads (
        id SERIAL PRIMARY KEY,
        provider TEXT NOT NULL,
        endpoint TEXT,
        payload JSONB,
        fetched_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS events_provider_idx ON events(provider);
      CREATE INDEX IF NOT EXISTS events_timestamp_idx ON events(timestamp DESC);
      CREATE INDEX IF NOT EXISTS events_type_idx ON events(event_type);
      CREATE INDEX IF NOT EXISTS weather_snapshots_location_idx ON weather_snapshots(location_name, timestamp DESC);
    `);
    console.log('[db] schema ready');
  } finally {
    client.release();
  }
}

export async function upsertEvent(event) {
  const {
    provider, provider_event_id, event_type, timestamp,
    latitude, longitude, depth, magnitude, severity,
    title, summary, source_confidence, raw_json,
  } = event;

  await pool.query(
    `INSERT INTO events
      (provider, provider_event_id, event_type, timestamp, latitude, longitude,
       depth, magnitude, severity, title, summary, source_confidence, raw_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (provider, provider_event_id) DO UPDATE SET
       timestamp = EXCLUDED.timestamp,
       severity = EXCLUDED.severity,
       title = EXCLUDED.title,
       summary = EXCLUDED.summary,
       raw_json = EXCLUDED.raw_json`,
    [provider, provider_event_id, event_type, timestamp,
     latitude, longitude, depth, magnitude, severity,
     title, summary, source_confidence ?? 1.0, JSON.stringify(raw_json)]
  );
}

export async function upsertAlert(alert) {
  const {
    provider, provider_alert_id, alert_type, severity,
    title, summary, area, issued_at, expires_at, raw_json,
  } = alert;

  await pool.query(
    `INSERT INTO hazard_alerts
      (provider, provider_alert_id, alert_type, severity, title, summary, area, issued_at, expires_at, raw_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (provider, provider_alert_id) DO UPDATE SET
       severity = EXCLUDED.severity,
       title = EXCLUDED.title,
       summary = EXCLUDED.summary,
       expires_at = EXCLUDED.expires_at`,
    [provider, provider_alert_id, alert_type, severity,
     title, summary, area, issued_at, expires_at, JSON.stringify(raw_json)]
  );
}

export async function saveRawPayload(provider, endpoint, payload) {
  await pool.query(
    `INSERT INTO raw_payloads (provider, endpoint, payload) VALUES ($1,$2,$3)`,
    [provider, endpoint, JSON.stringify(payload)]
  );
}

export async function updateSourceStatus(name, status) {
  await pool.query(
    `INSERT INTO sources (name, status, last_fetched_at)
     VALUES ($1,$2,NOW())
     ON CONFLICT (name) DO UPDATE SET status=$2, last_fetched_at=NOW()`,
    [name, status]
  );
}
