# STRATOS — Systems Monitor

A dynamic, visually striking real-time systems monitoring app built with **React**, a **Node.js/Express backend**, and **PostgreSQL**. Tracks live seismic activity, space weather (Kp index, solar wind, NOAA alerts), and weather forecasts — all with an animated starfield UI.

🌐 **Live Demo:** [chefmyklove.github.io/stratos-weather-app](https://chefmyklove.github.io/stratos-weather-app/)

---

## Features

- 🌍 **Geological** — Live earthquake feed from USGS, filterable by magnitude (M2.5+, M4.0+, M6.0+)
- 🌌 **Aurora / Space Weather** — Real-time Kp index, solar wind speed, and NOAA space weather alerts
- ☁️ **Weather** — City search, geolocation, 5-day forecast, AQI, hourly carousel
- 💾 **Save up to 5 locations** with persistent localStorage
- 🌡️ **°C / °F toggle**
- ✨ **Visual effects** — Animated parallax starfield, glassmorphism UI, rainbow shooting stars

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 (Vite) |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Styling | Plain CSS with CSS Variables |
| State | React Hooks |
| Data Sources | USGS Earthquake Feed, NOAA SWPC, OpenWeatherMap |
| Build / Deploy | Vite + GitHub Pages (frontend), Node.js server (backend) |

---

## Project Structure

```
stratos-react/
├── src/                        # React frontend
│   ├── components/
│   │   ├── GeologicalPage.jsx  # Earthquake map + list
│   │   ├── AuroraPage.jsx      # Space weather dashboard
│   │   ├── StarCanvas.jsx      # Animated canvas + shooting stars
│   │   ├── SearchBar.jsx       # City search with autocomplete
│   │   ├── HeroCard.jsx        # Main weather card
│   │   ├── WeatherCards.jsx    # Atmosphere, Wind, Sun, AQI cards
│   │   ├── ForecastCards.jsx   # 5-day + 48hr hourly carousel
│   │   └── SavedLocations.jsx  # Saved cities panel
│   ├── hooks/
│   │   ├── useEarthquakes.js   # Fetches from backend /api/systems/earthquakes
│   │   ├── useSpaceWeather.js  # Fetches from backend /api/systems/space-weather
│   │   ├── useWeather.js       # OpenWeatherMap API
│   │   └── useSavedLocations.js
│   └── utils/
│       └── weather.js
├── backend/                    # Node.js/Express backend
│   ├── src/
│   │   ├── index.js            # Entry point
│   │   ├── app.js              # Express app + CORS
│   │   ├── db.js               # PostgreSQL pool + migrations
│   │   ├── config.js           # Env-driven config
│   │   ├── scheduler.js        # Cron-based data refresh
│   │   ├── fetchers/
│   │   │   ├── earthquakes.js  # USGS GeoJSON ingestion
│   │   │   └── spaceWeather.js # NOAA SWPC Kp, solar wind, alerts
│   │   └── routes/
│   │       └── systems.js      # REST API routes
│   └── .env.example
└── package.json                # Root — runs both via concurrently
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL (local or hosted, e.g. [Neon](https://neon.tech))
- A free [OpenWeatherMap API key](https://openweathermap.org/api)

### Installation

```bash
git clone https://github.com/ChefMyKLove/stratos-systems-monitor.git
cd stratos-systems-monitor
npm install
cd backend && npm install && cd ..
```

### Configure the backend

Copy the example env file and fill in your values:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
PORT=3001
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/stratos
CORS_ORIGIN=http://localhost:5173
```

Create the database (local PostgreSQL):

```bash
psql -U postgres -c "CREATE DATABASE stratos;"
```

> **Note:** If your PostgreSQL runs on a non-default port (e.g. 5433), update the `DATABASE_URL` accordingly. If your password contains special characters like `@`, percent-encode them (e.g. `@` → `%40`).

### Add your OpenWeatherMap API key

Open `src/utils/weather.js` and replace the key on line 1:

```js
export const API_KEY = 'your_api_key_here';
```

### Run locally (frontend + backend together)

```bash
npm run dev:all
```

- Frontend: http://localhost:5173/stratos-weather-app/
- Backend API: http://localhost:3001

### Run separately

```bash
npm run dev          # frontend only
npm start --prefix backend  # backend only
```

### Build for production

```bash
npm run build
```

---

## Backend API Endpoints

| Endpoint | Description |
|---|---|
| `GET /health` | Health check |
| `GET /api/systems/earthquakes` | USGS earthquake events (filterable by `min_magnitude`, `limit`) |
| `GET /api/systems/space-weather` | Kp index, solar wind, NOAA alerts |
| `GET /api/systems/feed` | Unified event feed |
| `GET /api/systems/status` | Data source health status |

---

## Deployment (GitHub Pages — frontend)

```bash
npm run deploy
```

Builds and pushes to the `gh-pages` branch. For the backend, deploy to any Node.js host (Railway, Render, Fly.io) and set environment variables (`DATABASE_URL`, `CORS_ORIGIN`, `PORT`) in the platform dashboard.

---

## Error Handling

- Invalid city names return a user-friendly message
- Network/backend failures are caught and displayed per-page
- Geolocation denial handled gracefully
- Backend errors log to console without crashing the server
