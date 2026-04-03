# Balanced Live Tracking Roadmap

## Working Agreement

- Default profile for this shuttle app is `Balanced`
- Do one phase at a time and only move on when the exit criteria are met
- Mark `[x]` only after the code is merged and the phase-level manual checks pass
- Keep `/api/gps/ingest` backward compatible while expanding downstream telemetry

## Current Baseline Confirmed In Repo

- [x] `/api/gps/ingest` already accepts device `speed` and `heading`
- [x] Raw GPS fixes are already persisted into `vehicleLocation`
- [x] `/api/vehicles/stream` already broadcasts live snapshots over SSE
- [x] Driver reporting already sends the first fix immediately and then every `5s`
- [x] The map already has selected-vehicle follow smoothing on the client
- [x] `/api/stops/[id]/etas` has been replaced with live telemetry pipeline output
- [x] Map and stop UI now use the backend telemetry pipeline as the source of truth for live mode
- [x] Live vehicle payload now exposes `speedKph`, `routeDistanceM`, `matchedPosition`, and `etaConfidence`

## Phase 1: Telemetry Contract And Single Pipeline Backbone

Goal: create one backend-owned telemetry pipeline without breaking current ingest clients.

Checklist:

- [x] Add a single backend telemetry model that keeps both raw GPS and normalized live snapshot
- [x] Expand the live vehicle payload and SSE payload to include `speedKph`, `routeDistanceM`, `matchedPosition { lng, lat }`, and `etaConfidence`
- [x] Keep raw `latitude`/`longitude`, `heading`, `last_updated`, `crowding`, and `status`
- [x] Keep `/api/gps/ingest` request body shape backward compatible
- [x] Use device `speed` and `heading` only when values are sane, otherwise derive on the server
- [x] Centralize speed derivation in one backend place instead of multiple client/server locations

Likely touchpoints:

- `src/app/api/gps/ingest/route.ts`
- `src/lib/vehicles/store.ts`
- `src/lib/vehicles/live.ts`
- `src/features/shuttle/api.ts`
- likely a new utility under `src/lib/vehicles/`

Exit criteria:

- [x] One backend function can produce the live snapshot used by `/api/vehicles` and `/api/vehicles/stream`

## Phase 2: Route Matching And ETA Engine V1

Goal: make ETA depend on route progress instead of straight-line guesses.

Checklist:

- [x] Project every GPS fix onto the route and compute `routeDistanceM`
- [x] Keep two layers of position: raw position for display and matched position for ETA/progress
- [x] Compute derived speed from the latest two fixes on the server
- [x] Apply EMA smoothing before using speed in ETA
- [x] Use along-route speed EMA for ETA v1
- [x] Only compute ETA for vehicles that are `fresh` and `speed > 0.5 m/s`
- [x] Treat distance to stop `<= 10m` as `ETA = 0`
- [x] Sort the top 3 ETAs per stop by known ETA first, then distance as fallback
- [x] Implement an off-route corridor of `20m`
- [x] When off-route, keep the raw marker visible but lower `etaConfidence` or hide ETA temporarily

Likely touchpoints:

- new telemetry and ETA utilities under `src/lib/vehicles/`
- route and stop data loaders used by telemetry calculations
- `src/app/api/stops/[id]/etas/route.ts`

Exit criteria:

- [x] Backend can answer both route progress and per-stop ETA from the same telemetry state

## Phase 3: API Cutover To Server Truth

Goal: replace mock and client-derived ETA with backend output.

Checklist:

- [x] Replace `/api/stops/[id]/etas` mock data with real telemetry pipeline output
- [x] Make `/api/vehicles/stream` emit the expanded live payload
- [x] Update `/api/vehicles` response shape so both endpoints share the same contract
- [x] Update client types and hooks to consume the new server telemetry fields
- [x] Make map and stop panel use server ETA as the source of truth
- [x] Keep a graceful fallback when ETA confidence is low or unavailable

Likely touchpoints:

- `src/app/api/stops/[id]/etas/route.ts`
- `src/app/api/vehicles/stream/route.ts`
- `src/features/shuttle/api.ts`
- `src/features/shuttle/useVehicleStream.ts`
- `src/app/MapPage.tsx`
- `src/components/VehiclePanel.tsx`

Exit criteria:

- [x] Stop ETA view, map panel, and SSE live feed agree on the same backend telemetry

## Phase 4: Driver Reporting Cadence (Balanced)

Goal: move from fixed `5s` reporting to adaptive reporting based on vehicle state.

Checklist:

- [ ] Send every `2s` when `speed >= 2 m/s`
- [ ] Send every `5s` when `speed < 2 m/s`
- [ ] Send every `10s` best-effort in background
- [ ] Send immediately on duty start and duty stop
- [ ] Send immediately on route change
- [ ] Send immediately on crowding change
- [ ] Send immediately when heading changes by more than `15deg`
- [ ] Recover cadence correctly when the app returns from background to foreground

Likely touchpoints:

- `src/features/shuttle/useGpsReporter.ts`
- driver duty and crowding flows

Exit criteria:

- [ ] Reporter cadence degrades and recovers predictably without breaking session lifecycle

## Phase 5: Client Motion Smoothing And Delay UX

Goal: make motion feel live without lying about vehicle truth.

Checklist:

- [ ] Interpolate marker from the last point to the new point on every animation frame
- [ ] Extrapolate for at most one expected interval
- [ ] Freeze the marker when no update arrives after `1.5x` the expected interval
- [ ] Downgrade vehicle UI to delayed when the marker is frozen
- [ ] Make camera follow use the interpolated marker position instead of raw jumps
- [ ] Keep raw position and matched telemetry responsibilities clearly separated in UI logic

Likely touchpoints:

- `src/hooks/useLiveOrSimVehicles.ts`
- `src/app/MapPage.tsx`
- map rendering layer and telemetry consumers

Exit criteria:

- [ ] Continuous driving looks smooth, stopped vehicles do not jitter, and stale vehicles stop drifting

## Phase 6: Hardening, Tests, And Rollout

Goal: lock behavior before adding more sophistication.

Checklist:

- [ ] Add unit tests for derived speed, EMA smoothing, off-route corridor handling, and ETA sorting
- [ ] Add integration coverage for `/api/gps/ingest`, `/api/vehicles/stream`, and `/api/stops/[id]/etas`
- [ ] Verify continuous driving: backend receives updates at roughly `2s` cadence and marker motion stays smooth
- [ ] Verify stop dwell: marker does not jitter at the stop and ETA becomes `0` near the stop
- [ ] Verify signal loss: `> 60s` delayed, `> 5m` offline, `> 10m` hidden
- [ ] Verify off-route GPS drift: marker still shows but ETA does not jump to the wrong segment
- [ ] Verify crowding and driver-state changes update immediately
- [ ] Verify background to foreground cadence degrade/recover without breaking marker or ETA
- [ ] Add basic logging or metrics for cadence, stale age, and ETA confidence if needed

Exit criteria:

- [ ] Balanced live tracking is stable enough for normal shuttle operation without a traffic model or dwell-time model

## Out Of Scope For V1

- [ ] Traffic model
- [ ] Dwell-time model
- [ ] "Fastest possible" update cadence beyond the `Balanced` profile

## Reference Notes

- GTFS Realtime best practices are a feed interoperability baseline, not premium in-app live UX
- Google Fleet Engine treats `5s` as the fastest expected active-vehicle update interval, not the only acceptable UX shape
- Google Roads guidance supports `1-10s` sampling for strong snap-to-road quality
- Grab-style live tracking depends on route matching and routing distance, not raw haversine alone
