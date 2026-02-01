<!--
Sync Impact Report:
- Version change: 1.0.0 -> 2.0.0
- Modified principles:
  - I. Incremental Value Slices -> I. Phase 1 Scope Lock
  - II. Spec-First, Plan-Backed Delivery -> II. Real-Time Trust Over Guesswork
  - III. Explicit Testing Intent -> III. Data Reliability Is Explicit
  - IV. Contract-Defined Interfaces -> IV. Mobile-First Thai-First Accessibility
  - V. Observable & Safe Operations -> V. Privacy-Safe, Contract-Driven Engineering
- Added sections:
  - Product Invariants & Scope Boundaries (Phase 1)
  - UX Principles for Trust & Transparency
  - Performance & Reliability Principles
  - Accessibility & i18n Principles
  - Security & Privacy Principles
  - Engineering Quality
  - Documentation Discipline
  - Data-Contract Discipline
- Removed sections:
  - Required Artifacts & Structure
  - Workflow & Quality Gates
- Templates requiring updates:
  - UPDATED: .specify/templates/plan-template.md
  - UPDATED: .specify/templates/spec-template.md
  - UPDATED: .specify/templates/tasks-template.md
  - PENDING: .specify/templates/commands/*.md (directory missing)
- Follow-up TODOs: None
-->
# Campus Shuttle Map (Phase 1) Constitution

## Core Principles

### I. Phase 1 Scope Lock
- The app MUST be public with no login or user accounts.
- The experience MUST be read-only: users can only view map, vehicles, stops,
  route, and ETAs.
- The system MUST support a single campus route (outbound + inbound only).
- Admin/dispatch/booking/push notifications/personalization MUST NOT be added.
Rationale: Prevents scope drift and protects the Phase 1 delivery goal.

### II. Real-Time Trust Over Guesswork
- Vehicle positions MUST refresh every 3 seconds; polling is acceptable.
- ETA MUST be computed on the backend and rendered as provided.
- The UI MUST surface data freshness and reliability state.
Rationale: Trustworthy real-time visibility reduces perceived waiting time.

### III. Data Reliability Is Explicit
- Staleness thresholds and status rules are mandatory and consistent everywhere.
- Vehicles exceeding the hide threshold MUST be removed from passenger view.
Rationale: Prevents misleading or stale information from eroding trust.

### IV. Mobile-First Thai-First Accessibility
- Mobile usability is the primary experience.
- Thai is the default language; English is optional but must be complete if
  provided.
- Accessibility requirements in this constitution are non-negotiable.
Rationale: Public campus users rely on mobile and Thai-first experiences.

### V. Privacy-Safe, Contract-Driven Engineering
- No personal data collection; secure transport only.
- Backend contracts define ETA/status and are the source of truth.
- Engineering quality gates are mandatory for every change.
Rationale: Public systems must be safe, predictable, and maintainable.

## Product Invariants & Scope Boundaries (Phase 1)

- Public web app only; no native apps required in Phase 1.
- Read-only features only: map, vehicles, stops, route, and ETAs.
- Single campus route only (round-trip via outbound + inbound).
- No admin, dispatch, control actions, booking, payments, or notifications.
- Vehicle position update cadence is 3 seconds; polling is acceptable.
- ETA computation is backend-only; frontend must not infer or adjust ETA.

## UX Principles for Trust & Transparency

- Every vehicle and ETA display MUST show last-updated time or age.
- Status labels MUST be explicit and consistent:
  - Fresh: last update age <= 15 seconds.
  - Delayed: last update age > 15 seconds and <= 60 seconds.
  - Offline: last update age > 60 seconds and <= 120 seconds.
  - Hidden: last update age > 120 seconds; vehicle removed from passenger view.
- When delayed/offline/hidden, the UI MUST avoid precise ETAs and MUST show
  "Updating" or "No ETA" instead of guessing.
- UI copy MUST not imply control, dispatch, or guaranteed arrival times.

## Performance & Reliability Principles

- The UI MUST remain usable on mid-range mobile devices under poor connectivity.
- Polling failures MUST not block the UI; last known data must remain visible
  with freshness status.
- Static assets (route, stops, map tiles) SHOULD be cached to limit data usage.
- Degradation MUST be graceful: show stale/offline banners instead of blank
  screens or silent failures.

## Accessibility & i18n Principles

- All UI strings MUST be localizable; Thai is the default locale.
- If English is offered, it MUST be complete and parity with Thai.
- Keyboard navigation MUST reach all non-map controls with visible focus.
- Color contrast MUST meet WCAG AA; information MUST not rely on color alone.
- Status, vehicle, and stop information MUST have accessible text labels.

## Security & Privacy Principles

- HTTPS is mandatory; mixed content is prohibited.
- No personal data collection, storage, or telemetry.
- Logs MUST exclude PII and user identifiers; only vehicle/system data allowed.
- Public endpoints MUST be read-only and rate-limit safe.

## Engineering Quality

- Automated tests MUST cover:
  - ETA computation and backend status transitions.
  - Delayed/offline/hidden state rendering on the frontend.
- If a change cannot include automated tests, the spec MUST document the risk
  and a manual verification plan.
- Linting/formatting MUST run in CI and block merges on failure.
- Code review is mandatory and MUST check scope, reliability, and privacy rules.
- No speculative features: implement only what is defined in spec.md and plan.md.

## Documentation Discipline

- spec.md defines WHAT/WHY (scope, user stories, UX copy, thresholds, NFRs).
- plan.md defines HOW (architecture, data flow, contracts, testing approach).
- tasks.md defines execution only; do not mix spec or plan content into tasks.
- spec.md, plan.md, and tasks.md MUST be updated before implementation starts.
- /contracts/ is REQUIRED for any new or changed external interface.

## Data-Contract Discipline

- Backend contracts are the source of truth for ETA, status, and last-updated.
- Frontend MUST NOT compute ETA or override backend status fields.
- Missing or invalid fields MUST be handled safely with "No ETA" and clear
  status messaging.
- Contract changes MUST be backward compatible or coordinated with a single
  release cutover.

## Governance

- This constitution supersedes all other guidance in `.specify/` and agent
  prompts.
- Amendments require a dedicated change that includes rationale, an updated
  Sync Impact Report, and any needed template updates.
- Versioning follows semantic versioning: MAJOR for incompatible
  principle/governance changes, MINOR for added or expanded guidance, PATCH for
  clarifications.
- Compliance review is mandatory: specs, plans, tasks, and code reviews MUST
  check against this constitution; violations block delivery unless an approved
  exception is recorded.

**Version**: 2.0.0 | **Ratified**: 2026-02-01 | **Last Amended**: 2026-02-01
