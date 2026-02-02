# Quickstart: Real-time Campus Shuttle Map (Phase 1)

## Prerequisites

- Node.js 20.x
- npm 10.x
- MapTiler API key (stored in environment configuration)
- Access to the campus shuttle data feed

## Environment

Create environment files without committing secrets:

- `backend/.env`:
  - `SHUTTLE_FEED_URL=...`
  - `SHUTTLE_FEED_API_KEY=...` (if required)
- `frontend/.env`:
  - `VITE_MAPTILER_API_KEY=...`
  - `VITE_API_BASE_URL=http://localhost:3001`

## Run Backend

```bash
cd backend
npm install
npm run dev
```

Expected: API available at `http://localhost:3001`.

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Expected: App available at `http://localhost:3000`.

## Validation Checklist

- Map loads with route line and stops visible.
- Vehicle markers appear and update every 3 seconds.
- Each vehicle and ETA shows last-updated age and status.
- Delayed/Offline status shows "Updating" or "No ETA".
- Vehicles older than 120 seconds are hidden from passenger view.