# Phase 0 Research: Real-time Campus Shuttle Map (Phase 1)

## Decision 1: Map rendering stack

**Decision**: Use MapLibre GL JS with MapTiler Cloud styles and tiles via a
style URL that includes an API key from configuration.

**Rationale**: This meets the Phase 1 constraints, supports WebGL vector maps,
and provides required pan/zoom/marker/popup interactions.

**Alternatives considered**: Mapbox GL JS, Leaflet with raster tiles. Rejected
because MapLibre is required and vector styling is preferred.

## Decision 2: Read-only API design

**Decision**: Expose a small read-only REST API with endpoints for route,
stops, vehicles, and stop ETAs. Responses include server_time and last_updated
for reliability status.

**Rationale**: Matches the read-only scope, enables caching, and keeps
integration simple for Phase 1.

**Alternatives considered**: GraphQL and a single aggregated endpoint. Rejected
for higher complexity and lower cacheability.

## Decision 3: Data reliability rules

**Decision**: Apply status thresholds based on last_updated age: Fresh <= 15s,
Delayed > 15s to 60s, Offline > 60s to 120s, Hidden > 120s (removed from view).

**Rationale**: Implements explicit trust and transparency rules required by the
constitution and spec.

**Alternatives considered**: Dynamic thresholds by time of day or vehicle count.
Rejected for Phase 1 simplicity.

## Decision 4: Polling strategy

**Decision**: Poll the backend every 3 seconds for vehicle and ETA updates; if
polling fails, show stale/offline banners and keep last known data visible.

**Rationale**: Meets the real-time requirement while degrading gracefully on
poor connectivity.

**Alternatives considered**: WebSocket streaming. Rejected to keep Phase 1
integration simple.

## Decision 5: Secret handling for MapTiler API key

**Decision**: Store the MapTiler API key in environment configuration (not in
repo), inject into the frontend build/runtime configuration, and allow easy
rotation via env updates.

**Rationale**: Satisfies security constraints and supports key rotation.

**Alternatives considered**: Hardcoding in source. Rejected by constraints.