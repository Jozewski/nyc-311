# NYC 311 Vibe Metrics

A professional full-stack analytics dashboard for exploring NYC 311 service request patterns across all five boroughs.

This project combines a **React + Vite frontend** with an **Express + SQLite API** to turn 2023 complaint records into actionable insights for civic teams, analysts, and community advocates.

## Why This Project

New York runs on signals. Every 311 request is one signal from the street: noise complaints after midnight, heating outages in winter, sanitation spikes by neighborhood, and response-time differences across agencies.

NYC 311 Vibe Metrics helps you quickly answer:

- What issues flare up most in each borough?
- How do complaint volumes change by season?
- Which agencies resolve requests the fastest or slowest?
- Where city services may be under pressure?

## Features

- Borough-level flare-up analysis (top issue per borough)
- Seasonal trend exploration by month
- Cross-borough complaint comparison
- Agency resolution-time leaderboard
- Summary dashboard with high-level citywide metrics
- Lightweight local architecture powered by SQLite

## Tech Stack

### Frontend
- React 18
- Vite 5
- Tailwind CSS 3
- Recharts

### Backend
- Node.js
- Express 4
- better-sqlite3
- CORS

### Data
- `nyc_311_2023.db` (local SQLite database)
- `service_requests` table queried by API routes

## Project Structure

```text
nyc-311/
├─ index.js                 # Express app entrypoint (API on :8000)
├─ db.js                    # SQLite connection helper
├─ nyc_311_2023.db          # Local dataset (readonly access)
├─ server/
│  └─ routes/
│     ├─ boroughFlareups.js
│     ├─ seasonalTrends.js
│     ├─ boroughComparison.js
│     ├─ resolutionTime.js
│     └─ summary.js
└─ client/
   ├─ src/
   │  ├─ components/
   │  ├─ hooks/
   │  └─ constants.js
   └─ vite.config.js
```

## Getting Started

### 1. Install Dependencies

From the project root:

```bash
npm install
```

From the client folder:

```bash
cd client
npm install
```

### 2. Start the Backend API

From the project root:

```bash
npm run dev
```

Backend runs at:

- `http://localhost:8000`
- Health check: `http://localhost:8000/api/health`

### 3. Start the Frontend

In a second terminal:

```bash
cd client
npm run dev
```

Frontend runs at:

- `http://localhost:5173`

## API Endpoints

Base URL: `http://localhost:8000/api`

- `GET /health` - API health check
- `GET /summary` - headline dashboard metrics
- `GET /borough-flareups` - top complaint by borough
- `GET /seasonal-trends` - monthly complaint volume patterns
- `GET /borough-comparison` - borough side-by-side comparisons
- `GET /resolution-time` - agency response time analysis

## Scripts

### Root

- `npm run dev` - start backend with nodemon
- `npm start` - start backend with node

### Client (`client/`)

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run preview` - preview production build

## Data Notes

- Database path is configured in `db.js`.
- The backend opens SQLite in **readonly** mode.
- The current dashboard messaging references a 25,000-row 2023 sample.

## NYC Theme Direction

The interface uses a city-at-night palette and borough-focused storytelling to keep the product grounded in local civic context, not just generic charts.

Design intent:

- Strong dashboard hierarchy for quick urban insights
- Civic-professional tone for stakeholder demos
- Clear metric cards for rapid borough-level scanning



## Acknowledgments

- NYC Open Data 311 Service Requests
- The civic tech community building transparent city data tools
