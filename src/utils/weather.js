export const API_KEY = '0e43eedf4557a8a6f0cd4a4a91d43751';

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
  const [cur, fore] = await Promise.all([
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`).then(r => r.json()),
    fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`).then(r => r.json()),
  ]);
  if (cur.cod !== 200) throw new Error(`City not found: "${city}"`);
  const aqi = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${cur.coord.lat}&lon=${cur.coord.lon}&appid=${API_KEY}`).then(r => r.json()).catch(() => null);
  return { cur, fore, aqi };
}

export async function fetchWeatherByCoords(lat, lon) {
  const [cur, fore] = await Promise.all([
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`).then(r => r.json()),
    fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`).then(r => r.json()),
  ]);
  const aqi = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`).then(r => r.json()).catch(() => null);
  return { cur, fore, aqi };
}

export async function fetchGeoSuggestions(query) {
  const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=6&appid=${API_KEY}`);
  return res.json();
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
