import cron from 'node-cron';
import { fetchEarthquakes } from './fetchers/earthquakes.js';
import { fetchSpaceWeather, backfillKp30day } from './fetchers/spaceWeather.js';
import { pruneRawPayloads } from './db.js';

const RAW_PAYLOAD_RETENTION_DAYS = 3;

export function startScheduler() {
  // Earthquakes every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    console.log('[scheduler] running earthquake fetch');
    await fetchEarthquakes();
  });

  // Space weather every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    console.log('[scheduler] running space weather fetch');
    await fetchSpaceWeather();
  });

  // raw_payloads is debug/audit data only — events/alerts are already extracted
  // into their own tables, so old raw payloads don't need to be kept long-term.
  cron.schedule('0 3 * * *', async () => {
    const deleted = await pruneRawPayloads(RAW_PAYLOAD_RETENTION_DAYS);
    console.log(`[scheduler] pruned ${deleted} raw_payloads rows older than ${RAW_PAYLOAD_RETENTION_DAYS}d`);
  });

  // Populate DB immediately on startup (don't wait for first cron tick)
  fetchSpaceWeather();
  backfillKp30day();
  pruneRawPayloads(RAW_PAYLOAD_RETENTION_DAYS).then(deleted =>
    console.log(`[scheduler] startup prune: removed ${deleted} old raw_payloads rows`)
  );

  console.log('[scheduler] all jobs registered');
}
