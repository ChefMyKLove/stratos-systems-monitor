import { BACKEND_URL, TOKEN_KEY } from './auth';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` };
}

export const RANDOM_CITIES = [
  'Tokyo','London','New York','Sydney','Cairo','Rio de Janeiro','Mumbai','Moscow',
  'Dubai','Toronto','Paris','Berlin','Singapore','Bangkok','Istanbul','Seoul',
  'Cape Town','Mexico City','Buenos Aires','Nairobi','Oslo','Reykjavik',
  'Kathmandu','Havana','Marrakech','Ulaanbaatar','Anchorage','Queenstown'
];

export function weatherEmoji(main, desc = '') {
  const d = desc.toLowerCase();
  if (d.includes('thunder')) return '⛈️';
  if (d.includes('drizzle') || d.includes('light rain')) return '🌦️';
  if (d.includes('rain') || d.includes('shower')) return '🌧️';
  if (d.includes('snow') || d.includes('blizzard')) return '❄️';
  if (d.includes('sleet') || d.includes('ice')) return '🌨️';
  if (d.includes('fog') || d.includes('mist') || d.includes('haze')) return '🌫️';
  if (d.includes('smoke') || d.includes('dust') || d.includes('sand')) return '🌪️';
  if (d.includes('overcast')) return '☁️';
  if (d.includes('broken') || d.includes('scattered')) return '🌥️';
  if (d.includes('few clouds') || d.includes('partly')) return '⛅';
  if (main === 'Clear') return '☀️';
  if (main === 'Clouds') return '🌤️';
  return '🌡️';
}

export function windDir(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export function fmtTime(unix) {
  return new Date(unix * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function aqiLabel(aqi) {
  const labels = ['', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
  const colors = ['', 'var(--success)', '#86efac', 'var(--warm)', 'var(--accent3)', 'var(--danger)'];
  return { label: labels[aqi] || 'N/A', color: colors[aqi] || 'var(--muted)' };
}

export function convertTemp(celsius, unit) {
  if (unit === 'F') return Math.round(celsius * 9 / 5 + 32);
  return Math.round(celsius);
}

export function tempSymbol(unit) {
  return `°${unit}`;
}

export function getBgCondition(condition) {
  const c = condition.toLowerCase();
  if (c.includes('rain') || c.includes('drizzle')) return { hue1: 215, hue2: 240 };
  if (c.includes('thunder')) return { hue1: 260, hue2: 300 };
  if (c.includes('snow')) return { hue1: 200, hue2: 220 };
  if (c.includes('cloud')) return { hue1: 220, hue2: 250 };
  if (c.includes('clear')) return { hue1: 195, hue2: 260 };
  return { hue1: 200, hue2: 270 };
}

export async function fetchWeatherByCity(city) {
  const res = await fetch(`${BACKEND_URL}/api/weather/current?city=${encodeURIComponent(city)}`, { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `City not found: "${city}"`);
  }
  return res.json();
}

export async function fetchWeatherByCoords(lat, lon) {
  const res = await fetch(`${BACKEND_URL}/api/weather/current?lat=${lat}&lon=${lon}`, { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Could not fetch weather for your location.');
  }
  return res.json();
}

export async function fetchGeoSuggestions(query) {
  const res = await fetch(`${BACKEND_URL}/api/weather/geocode?q=${encodeURIComponent(query)}`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

// Full available archive for a location — fetched once, then browsed client-side (any day, any year).
export async function fetchFullWeatherHistory(lat, lon) {
  const res = await fetch(`${BACKEND_URL}/api/weather/history?lat=${lat}&lon=${lon}`, { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Could not fetch weather history.');
  }
  return res.json();
}

// Pulls every occurrence of a given month/day (1-indexed month) out of a full-history payload,
// newest year first.
export function extractDayAcrossYears(fullData, month, day) {
  const { time, temperature_2m_max, temperature_2m_min, precipitation_sum, weathercode } = fullData.daily;
  const rows = [];
  for (let i = 0; i < time.length; i++) {
    const d = new Date(time[i]);
    if (d.getMonth() + 1 === month && d.getDate() === day) {
      rows.push({
        year: d.getFullYear(),
        date: time[i],
        tempMax: temperature_2m_max[i],
        tempMin: temperature_2m_min[i],
        precip: precipitation_sum[i],
        weathercode: weathercode[i],
      });
    }
  }
  return rows.sort((a, b) => b.year - a.year);
}

export function summarizeDayHistory(rows) {
  if (rows.length === 0) return null;
  const recordHigh = rows.reduce((best, r) => (r.tempMax > best.tempMax ? r : best), rows[0]);
  const recordLow = rows.reduce((best, r) => (r.tempMin < best.tempMin ? r : best), rows[0]);
  const avgHigh = rows.reduce((sum, r) => sum + r.tempMax, 0) / rows.length;
  const avgLow = rows.reduce((sum, r) => sum + r.tempMin, 0) / rows.length;
  return { recordHigh, recordLow, avgHigh, avgLow, years: rows.length };
}

// Maps Open-Meteo WMO weather codes to the same emoji vocabulary as current conditions.
export function wmoCodeEmoji(code) {
  if ([95, 96, 99].includes(code)) return '⛈️';
  if ([51, 53, 55, 56, 57].includes(code)) return '🌦️';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  if ([45, 48].includes(code)) return '🌫️';
  if ([1, 2].includes(code)) return '⛅';
  if (code === 3) return '☁️';
  if (code === 0) return '☀️';
  return '🌡️';
}

export function groupForecastByDay(foreList) {
  const days = {};
  foreList.forEach(item => {
    const key = new Date(item.dt * 1000).toLocaleDateString('en', { weekday: 'short' });
    if (!days[key]) days[key] = { temps: [], pops: [], icon: item.weather[0], items: [] };
    days[key].temps.push(item.main.temp);
    days[key].pops.push(item.pop || 0);
    days[key].items.push(item);
  });
  return days;
}
