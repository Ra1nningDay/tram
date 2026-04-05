# Map Focus Panel Phases

## Phase 1: Camera decoupling
- [x] Add selection-origin state for map, search, panel, stop, and none
- [x] Stop auto-flying when a vehicle is chosen from the map after a stop focus
- [x] Stop auto-flying when reselection happens inside the same vehicle-focus session
- [x] Keep the current viewport when blank-map taps clear vehicle focus

Success criteria: map selection no longer steals the camera except for the existing search/panel-driven focus paths.

Notes: search-driven focus should stay intact; blank-map clear should cancel focus without a zoom-out reset.

## Phase 2: Stop header cleanup
- [x] Remove user-to-stop distance and walking ETA from the stop panel
- [x] Remove stop-distance calculation and prop plumbing from the map page and panel
- [x] Keep only stop title, stop badge, vehicle count, and close action in the stop context header

Success criteria: stop panel no longer mixes user-walking context into the vehicle ETA UI.

Notes: this is a presentation cleanup only; backend ETA and stop lookups stay unchanged.

## Phase 3: One-time vehicle promotion
- [x] Replace selected-vehicle reorder with a promoted-vehicle id
- [x] Start promotion only on the first map click of a vehicle-focus session
- [x] Keep list order stable on later map reselections inside the same session
- [x] Reset the promotion session after blank-map clear
- [x] Limit auto-scroll to explicit search expansion instead of every vehicle selection

Success criteria: list ordering stays stable after the first promoted map selection.

Notes: search-origin behavior should still surface the searched vehicle predictably.

## Phase 4: Mobile free-height drag panel
- [x] Add snap vs free-height state for the mobile bottom sheet
- [x] Allow header tapping to keep cycling through snap levels
- [x] Allow header dragging to set a clamped free height that persists after release
- [x] Keep drag gestures scoped to the header so the list can still scroll normally
- [x] Keep desktop panel behavior unchanged

Success criteria: mobile panel supports both snap toggles and free drag without fighting the list scroll.

Notes: programmatic open should still start from the existing snap preset before the user drags.

## Phase 5: Tests, build, lint, ship
- [x] Add logic-level tests for focus transitions, promotion resets, and mobile panel height behavior
- [x] Run `pnpm test`
- [x] Run `pnpm lint`
- [x] Run `pnpm build`
- [ ] Commit and push to `master`

Success criteria: the new interaction model is covered by tests and passes test, lint, and build.

Notes: gesture-heavy behavior can be verified through extracted state helpers if DOM drag harness coverage is too heavy for this repo.
