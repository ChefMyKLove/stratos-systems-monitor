import 'dotenv/config';
import app from './app.js';
import { migrate } from './db.js';
import { startScheduler } from './scheduler.js';
import { fetchEarthquakes } from './fetchers/earthquakes.js';
import { fetchSpaceWeather } from './fetchers/spaceWeather.js';
import { config } from './config.js';

async function main() {
  await migrate();

  console.log('[startup] running initial fetches...');
  await Promise.allSettled([
    fetchEarthquakes(),
    fetchSpaceWeather(),
  ]);

  startScheduler();

  app.listen(config.port, () => {
    console.log(`[server] stratos-backend running on http://localhost:${config.port}`);
  });
}

main().catch(err => {
  console.error('[fatal]', err);
  process.exit(1);
});
