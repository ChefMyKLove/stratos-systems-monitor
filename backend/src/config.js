import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3001,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/stratos',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  openWeatherMapApiKey: process.env.OPENWEATHERMAP_API_KEY,

  jwtSecret: process.env.JWT_SECRET,

  patreon: {
    clientId: process.env.PATREON_CLIENT_ID,
    clientSecret: process.env.PATREON_CLIENT_SECRET,
    redirectUri: process.env.PATREON_REDIRECT_URI,
    // Any tier in this list grants access. Comma-separated in env, e.g. "27277603,27277625".
    tierIds: (process.env.PATREON_TIER_IDS || '').split(',').map(s => s.trim()).filter(Boolean),
    stratosUrl: process.env.STRATOS_URL || 'http://localhost:5173',
  },

  providers: {
    earthquakes: {
      feedUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
      intervalMinutes: 2,
    },
    spaceWeather: {
      kpUrl: 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json',
      kp3dayUrl: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
      // GFZ (kp.gfz.de) — authoritative Kp source, used for 30-day backfill
      kp30dayBaseUrl: 'https://kp.gfz.de/app/json/',
      alertsUrl: 'https://services.swpc.noaa.gov/products/alerts.json',
      solarWindUrl: 'https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json',
      intervalMinutes: 10,
    },
  },
};
