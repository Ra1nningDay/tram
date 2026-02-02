# Feature Specification: Real-time Campus Shuttle Map (Phase 1)

**Feature Branch**: `001-realtime-shuttle-map`  
**Created**: 2026-02-01  
**Status**: Draft  
**Input**: User description: "Build a Phase 1 public real-time campus shuttle map."

## Phase 1 Scope & Non-Goals *(mandatory)*

**In Scope**:
- Public, read-only web app (no login/accounts)
- Single campus route (outbound + inbound)
- Map with vehicles, stops, and route line
- Tap/click to view vehicle and stop details, including ETAs
- Vehicle positions update every 3 seconds and always show last updated

**Out of Scope**:
- Admin/dispatch/driver controls
- Booking, payments, notifications, personalization
- Additional routes beyond the single campus loop
- Native mobile apps

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View live shuttle map (Priority: P1)

As a campus rider, I open the map and see the route, stops, and live shuttle
positions updating every 3 seconds with last-updated status.

**Why this priority**: Real-time visibility is the core value that reduces
uncertainty and perceived waiting time.

**Independent Test**: Open the app and confirm the route, stops, and live
vehicle markers appear with freshness status and update cadence.

**Acceptance Scenarios**:

1. **Given** the app is opened during service, **When** the map loads, **Then**
   the route, stops, and vehicle markers are visible with last-updated age.
2. **Given** a vehicle marker is visible, **When** I pan/zoom or tap it,
   **Then** the map responds and a details popup appears.
3. **Given** a vehicle is visible, **When** 3 seconds pass, **Then** its
   position and last-updated age refresh without user action.

---

### User Story 2 - Check stop ETAs with reliability (Priority: P2)

As a rider, I select a stop to see upcoming ETAs and their reliability status.

**Why this priority**: ETAs help riders decide where to wait and whether to
walk.

**Independent Test**: Select a stop and verify ETAs are displayed with status,
and show safe fallbacks when data is stale or missing.

**Acceptance Scenarios**:

1. **Given** a stop has current ETA data, **When** I select that stop, **Then**
   I see ETAs with last-updated age and status labels.
2. **Given** ETA data is delayed or missing, **When** I select that stop,
   **Then** I see "Updating" or "No ETA" instead of a precise time.

---

### User Story 3 - Understand data reliability (Priority: P3)

As a rider, I can understand when shuttle data is fresh, delayed, offline, or
hidden so I am not misled.

**Why this priority**: Trust and transparency prevent riders from acting on
stale or unreliable information.

**Independent Test**: Simulate stale timestamps and verify status transitions
and hide behavior.

**Acceptance Scenarios**:

1. **Given** a vehicle last updated more than 15 seconds ago, **When** it is
   displayed, **Then** it shows the Delayed status and does not imply a precise
   arrival time.
2. **Given** a vehicle last updated more than 120 seconds ago, **When** the UI
   renders, **Then** that vehicle is removed from passenger view.

---

### Edge Cases

- No vehicles are active on the route.
- All vehicles are stale or offline.
- ETA is missing for a stop with an active vehicle.
- A user goes offline after the initial load.
- Map tiles fail to load or are slow.

## Requirements *(mandatory)*

### Functional Requirements

Acceptance coverage: Each FR is validated by at least one acceptance scenario
in User Stories 1-3.

- **FR-001**: The system MUST provide a public, read-only web map showing the
  single campus route and all stops.
- **FR-002**: The system MUST display live vehicle positions and update them
  every 3 seconds.
- **FR-003**: The system MUST display last-updated age for each vehicle and ETA.
- **FR-004**: ETA values MUST be computed by the backend and displayed as
  provided without frontend adjustment.
- **FR-005**: The system MUST apply freshness statuses using the defined
  thresholds (Fresh, Delayed, Offline, Hidden).
- **FR-006**: Vehicles that exceed the Hidden threshold MUST be removed from the
  passenger view and excluded from ETAs.
- **FR-007**: The UI MUST show "Updating" or "No ETA" when data is delayed,
  offline, or missing.
- **FR-008**: The map MUST support pan/zoom and tap/click interactions for
  vehicle and stop details.
- **FR-009**: The app MUST support a single campus route only.
- **FR-010**: The app MUST not include login, accounts, admin, or dispatch
  actions.
- **FR-011**: Thai MUST be the default language; English is optional but must be
  complete if offered.
- **FR-012**: The UI MUST remain usable under poor connectivity using last known
  data with explicit status messaging.
- **FR-013**: The interactive map MUST be rendered with MapLibre GL JS.
- **FR-014**: Map tiles and styles MUST be served from MapTiler Cloud using an
  API key managed as a secret and rotatable without code changes.
- **FR-015**: The map UI MUST provide popups for vehicle and stop details.

### Testing Requirements *(mandatory)*

- **TR-001**: Automated tests are REQUIRED for ETA computation, status
  transitions, and frontend stale/hidden rendering.
- **TR-002**: Test types and scope MUST cover unit, integration, and contract
  expectations for the shuttle data interface.
- **TR-003**: If any automated tests are infeasible, the spec MUST document the
  risk and the manual verification steps.

### Data Reliability Rules *(mandatory)*

- **DR-001**: Vehicle position update cadence is 3 seconds; polling acceptable.
- **DR-002**: Fresh <= 15s, Delayed > 15s to 60s, Offline > 60s to 120s,
  Hidden > 120s (based on last-updated age).
- **DR-003**: Last-updated age MUST be visible anywhere a vehicle or ETA is
  shown.

### UX Trust & Transparency *(mandatory)*

- **UX-001**: Status labels MUST include Fresh (UI label "Live"), Delayed,
  Offline, and Hidden.
- **UX-002**: When Delayed or Offline, ETA MUST display "Updating" or "No ETA".
- **UX-003**: UI copy MUST avoid language implying guarantees (for example,
  "arriving now", "on time", "guaranteed").

### Performance & Connectivity *(mandatory)*

- **PF-001**: On a typical campus mobile connection, users MUST reach a usable
  map view in 5 seconds or less.
- **PF-002**: If polling fails, the UI MUST keep last known data visible with a
  stale/offline banner.
- **PF-003**: Static route, stop, and tile assets SHOULD be cached to limit data
  usage without masking staleness.

### Accessibility & i18n *(mandatory)*

- **AI-001**: Thai is default locale; English is optional but complete if
  offered.
- **AI-002**: Keyboard navigation MUST reach all non-map controls with visible
  focus.
- **AI-003**: Contrast MUST meet WCAG AA; status and ETA meanings MUST not rely
  on color alone.
- **AI-004**: Vehicle, stop, and status data MUST have accessible text labels.

### Security & Privacy *(mandatory)*

- **SP-001**: HTTPS only; mixed content is prohibited.
- **SP-002**: No personal data collection or storage; telemetry must be
  aggregate and anonymous.
- **SP-003**: Logs MUST exclude PII and user identifiers.
- **SP-004**: The MapTiler API key MUST be treated as a secret in configuration
  and be easily rotatable.

### Data Contracts *(mandatory)*

- **DC-001**: Backend contract MUST provide vehicle id, location, direction,
  last-updated timestamp, status, and stop ETAs required for display.
- **DC-002**: Frontend MUST handle missing or invalid fields by showing
  "No ETA" and a clear status message.
- **DC-003**: Contract changes MUST be backward compatible or coordinated with a
  single release cutover.

### External Interfaces *(include if feature exposes/changes interfaces)*

- **Shuttle Data API**: Read-only data feed for vehicles, stops, route, and
  ETAs; consumer is the public web app; compatibility must preserve existing
  fields and status semantics.
- **Map tiles/style provider**: MapTiler Cloud styles/tiles via API key; used by
  the public web app for rendering.

### Key Entities *(include if feature involves data)*

- **Vehicle**: Identifier, current location, direction, last-updated, status.
- **Stop**: Identifier, name, location, sequence on route.
- **Route**: Identifier, direction, path geometry, list of stops.
- **ETA**: Stop, vehicle, minutes-to-arrival, last-updated.

## Assumptions

- The campus provides a single authoritative route and stop list for Phase 1.
- The backend provides ETA computation for the route and vehicles.
- When no shuttles are in service, the UI will state "No shuttles in service".

## Dependencies

- Access to a real-time shuttle data feed from campus operations.
- MapTiler API key and style access for map rendering.
- Approved Thai translations for all user-facing strings (English optional).

## Success Criteria *(mandatory)*

### Measurable Outcomes (Success Metrics)

- **SC-001**: At least 70% of surveyed users report reduced uncertainty after
  using the map.
- **SC-002**: 90% of sessions can view an ETA for a selected stop within
  30 seconds.
- **SC-003**: 95% of vehicle and ETA displays include last-updated age and a
  reliability status label.
- **SC-004**: During service hours, 95% of ETA displays have last-updated age
  <= 60 seconds.
- **SC-005**: The app reaches at least 1,000 weekly sessions during term time.