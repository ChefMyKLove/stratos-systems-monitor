import cron from 'node-cron';
import { fetchEarthquakes } from './fetchers/earthquakes.js';
import { fetchSpaceWeather } from './fetchers/spaceWeather.js';

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

  console.log('[scheduler] all jobs registered');
}
