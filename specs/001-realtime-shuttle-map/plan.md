# Implementation Plan: Real-time Campus Shuttle Map (Phase 1)

**Branch**: `001-realtime-shuttle-map` | **Date**: 2026-02-01 | **Spec**: `specs/001-realtime-shuttle-map/spec.md`
**Input**: Feature specification from `/specs/001-realtime-shuttle-map/spec.md`

## Summary

Deliver a public, read-only web map that shows a single campus shuttle route,
live vehicle positions (3-second updates), stop ETAs, and clear freshness
status. The frontend uses React + TypeScript + Vite with MapLibre GL JS and
MapTiler styles, while a backend API computes ETA and status and serves
read-only data. The experience is mobile-first, Thai-first, privacy-safe, and
reliability-focused.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), Node.js 20 LTS (backend)
**Primary Dependencies**: React 18 + Vite, TanStack Query, MapLibre GL JS,
MapTiler styles/tiles, shadcn/ui, Tailwind CSS
**Storage**: N/A (stateless; route/stops config files, in-memory cache)
**Testing**: Vitest + React Testing Library (unit), Supertest (API
integration), Playwright (UI), OpenAPI contract tests
**Target Platform**: Modern mobile/desktop browsers; backend on Linux
**Project Type**: web (frontend + backend)
**Performance Goals**: Usable map view <= 5s on typical campus mobile
connections; 3-second data refresh
**Constraints**: Read-only, single route, no accounts; MapLibre + MapTiler;
MapTiler API key via secrets; graceful degradation on poor connectivity
**Scale/Scope**: Single campus, <= 50 stops, <= 20 vehicles, ~1k weekly sessions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Scope lock confirmed: public, read-only, single campus route, no admin,
      dispatch, booking, or notifications.
- [x] Update cadence is 3 seconds; polling acceptable; ETA computed on backend
      only.
- [x] Data reliability thresholds implemented (Delayed > 15s, Offline > 60s,
      Hidden > 120s) with last-updated display.
- [x] UX copy avoids misleading precision; stale/unknown states are explicit.
- [x] Mobile-first performance and graceful degradation on poor connectivity.
- [x] Thai-first i18n and accessibility requirements covered (keyboard,
      contrast, labels).
- [x] Security/privacy rules met (HTTPS, no personal data, safe logs).
- [x] Engineering quality gates satisfied (tests for ETA/status, linting, code
      review, no speculative features).
- [x] Documentation discipline followed; contracts defined for interfaces.

Post-design re-check (2026-02-01): All gates remain satisfied.

## Architecture (Modules, Responsibilities, Folder Structure)

### Frontend (React + Vite)

- **App Shell**: routing, layout, global providers (QueryClient, i18n)
  - `frontend/src/app/` (App, providers, route config)
- **Map Feature**: MapLibre instance, layers, interaction handlers
  - `frontend/src/features/map/` (MapView, layers, sources, map hooks)
- **Shuttle Data**: API client, TanStack Query hooks, data normalization
  - `frontend/src/features/shuttle/` (api.ts, hooks.ts, selectors.ts)
- **UI Components**: shadcn/ui components and feature-specific widgets
  - `frontend/src/components/ui/` (shadcn components)
  - `frontend/src/components/` (StatusBadge, EtaList, StopPopup)
- **State/Config**: environment config, constants, thresholds
  - `frontend/src/lib/config.ts`
  - `frontend/src/lib/thresholds.ts`
- **i18n**: Thai default, optional English
  - `frontend/src/i18n/`

### Backend (Read-only API)

- **API Routes**: route, stops, vehicles, stop ETAs
  - `backend/src/api/`
- **Services**: ETA computation, status derivation, data fetchers
  - `backend/src/services/`
- **Models/Validators**: schema validation for feed and responses
  - `backend/src/models/`, `backend/src/validators/`
- **Config**: secrets and environment loading
  - `backend/src/config/`

## Map Integration Approach

**Choice**: A) Direct MapLibre instance in React.

**Justification**: Direct MapLibre integration provides full control over
sources/layers, avoids wrapper abstractions, and enables efficient updates via
`source.setData` without re-creating the map. This reduces re-renders and keeps
performance predictable on mobile.

## Data Contracts Required From Backend

All responses include `server_time` (ISO 8601) to compute last-updated age.
Empty lists return `[]` with 200. Errors return JSON with `error_code` and
`message` plus HTTP status.

### Vehicles

- **Endpoint**: `GET /api/vehicles`
- **Fields**:
  - `id` (string)
  - `label` (string, optional)
  - `latitude` (number)
  - `longitude` (number)
  - `heading` (number, optional)
  - `direction` ("outbound" | "inbound")
  - `last_updated` (ISO 8601)
  - `status` ("fresh" | "delayed" | "offline" | "hidden")
- **Empty case**: `vehicles: []` when none in service
- **Error case**: 503 when feed unavailable

### Stops

- **Endpoint**: `GET /api/stops`
- **Fields**:
  - `id` (string)
  - `name_th` (string)
  - `name_en` (string, optional)
  - `latitude` (number)
  - `longitude` (number)
  - `sequence` (number)
  - `direction` ("outbound" | "inbound")

### Route Geometry

- **Endpoint**: `GET /api/route`
- **Fields**:
  - `id` (string)
  - `name` (string)
  - `directions[]` with `direction` and `geometry` (GeoJSON LineString)

### ETAs

- **Endpoint**: `GET /api/stops/{stop_id}/etas`
- **Fields**:
  - `stop_id` (string)
  - `vehicle_id` (string, optional)
  - `eta_minutes` (number, integer)
  - `arrival_time` (ISO 8601, optional)
  - `last_updated` (ISO 8601)
  - `status` ("fresh" | "delayed" | "offline" | "hidden")
- **Empty case**: `etas: []` when no upcoming arrivals

## Realtime Strategy (TanStack Query)

- `refetchInterval: 3000` for vehicles and ETAs
- `staleTime: 0` to ensure data is considered stale immediately and always
  refreshed on interval
- `refetchOnWindowFocus: true` to recover quickly after tab switches
- `refetchOnReconnect: true` to recover after network loss
- `refetchIntervalInBackground: false` to avoid background polling on mobile
- `retry: 2` with exponential backoff to avoid hammering on outages
- `keepPreviousData: true` to prevent UI flicker while polling

Rationale: Keeps the map responsive, minimizes data gaps, and degrades safely
on poor connectivity without over-polling in the background.

## Map Rendering Strategy

- Initialize a single MapLibre instance on mount and store it in a `ref`.
- Add GeoJSON sources and layers:
  - **Route**: LineString per direction (static source)
  - **Stops**: Point features with direction-based styling (static source)
  - **Vehicles**: Point features with status-based styling (dynamic source)
- Update vehicles via `map.getSource('vehicles').setData(newGeoJson)` on each
  poll; never recreate the map.
- Use popups for vehicle and stop details; popup content is driven by feature
  properties and UI components.

## UX Rules for Trust

- Always show last-updated age on vehicle and ETA displays.
- Status thresholds:
  - Fresh <= 15s
  - Delayed > 15s and <= 60s
  - Offline > 60s and <= 120s
  - Hidden > 120s (remove from passenger view)
- When Delayed or Offline, show "Updating" or "No ETA" instead of precise
  arrival times.
- Loading: show map skeleton and status banner without blocking map controls.
- Error: show a non-blocking banner with retry hint; keep last-known data.

## Config & Security

- MapTiler API key is loaded from environment config (Vite env) and never
  committed. Rotate by updating env and redeploying.
- No personal data collection or storage. Logs contain only system/vehicle data.
- HTTPS only; mixed content is blocked by CSP.

## Performance Considerations

- Mobile-first layout; avoid heavy sidebars and large DOM lists.
- Memoize map feature GeoJSON and avoid re-rendering the Map component.
- Use status-based styling in MapLibre layers rather than DOM markers.
- Degrade gracefully if WebGL fails: show a fallback message and stop polling.

## Testing Strategy + Acceptance Checklist

### Testing Strategy

- **Unit**: status threshold calculation, last-updated age formatting, ETA
  display rules.
- **Integration (API)**: vehicles/stops/route/eta endpoints return required
  fields, empty/error cases.
- **Contract**: OpenAPI validation of responses.
- **UI**: Map loads, popups open, vehicle updates reflect polling.

### Acceptance Checklist (Phase 1)

- Map loads with route line, stops, and vehicles.
- Vehicle positions update every 3 seconds.
- Last-updated age is visible for vehicles and ETAs.
- Delayed/Offline states show "Updating" or "No ETA".
- Vehicles older than 120 seconds are hidden.
- Thai default UI; English optional and complete if enabled.
- No login or admin actions are present.

## Delivery Milestones (convertible to tasks)

1. Project scaffolding (frontend + backend), environment config, linting
2. Backend read-only endpoints with status thresholds
3. Frontend MapLibre map with route/stops rendering
4. Live vehicle polling and status UI
5. Stop ETA views with reliability states
6. Testing pass and performance/accessibility review

## Project Structure

### Documentation (this feature)

```text
specs/001-realtime-shuttle-map/
|-- plan.md              # This file (/speckit.plan command output)
|-- research.md          # Phase 0 output (/speckit.plan command)
|-- data-model.md        # Phase 1 output (/speckit.plan command)
|-- quickstart.md        # Phase 1 output (/speckit.plan command)
|-- contracts/           # Phase 1 output (/speckit.plan command)
`-- tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
|-- src/
|   |-- api/
|   |-- services/
|   |-- models/
|   |-- config/
|   `-- validators/
`-- tests/
    |-- contract/
    |-- integration/
    `-- unit/

frontend/
|-- src/
|   |-- app/
|   |-- components/
|   |-- components/ui/
|   |-- features/
|   |-- i18n/
|   `-- lib/
`-- tests/
    |-- integration/
    `-- unit/
```

**Structure Decision**: Web application split into backend and frontend to
separate ETA/status computation from the map UI while keeping the app
read-only.

## Complexity Tracking

No constitution violations; complexity tracking not required.