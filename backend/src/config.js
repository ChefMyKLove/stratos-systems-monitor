import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3001,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/stratos',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  providers: {
    earthquakes: {
      feedUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
      intervalMinutes: 2,
    },
    spaceWeather: {
      kpUrl: 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json',
      alertsUrl: 'https://services.swpc.noaa.gov/products/alerts.json',
      solarWindUrl: 'https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json',
      intervalMinutes: 10,
    },
  },
};
