# Repository Guidelines

This repository currently contains the Phase 1 product specifications and
planning artifacts for the public real-time campus shuttle map. Keep changes
aligned with the constitution and feature specs in `specs/`.

## Project Structure & Module Organization

- `specs/`: Feature workspaces, e.g. `specs/001-realtime-shuttle-map/` containing
  `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`,
  `quickstart.md`, and `checklists/`.
- `.specify/`: Templates and PowerShell scripts that generate or update specs
  and plans.
- `.codex/`: Agent prompts used by the spec/plan workflow.

## Build, Test, and Development Commands

There is no runnable app yet. Use the workflow scripts to manage specs:

- `.specify/scripts/powershell/create-new-feature.ps1 "<feature>"`:
  create a new feature workspace.
- `.specify/scripts/powershell/setup-plan.ps1 -Json`:
  copy the plan template into the current feature.
- `.specify/scripts/powershell/update-agent-context.ps1 -AgentType codex`:
  sync agent context from the plan.

## Coding Style & Naming Conventions

- Documentation is Markdown; keep headings clear and lines under ~100 chars.
- Contracts in `contracts/` are YAML with 2-space indentation.
- Feature directories follow `specs/NNN-short-name/` naming (e.g.
  `specs/001-realtime-shuttle-map`).

## Testing Guidelines

No automated tests exist yet. When implementation begins, follow the plan’s
testing stack and place tests under `backend/tests/` and `frontend/tests/` with
`*.spec.ts` naming. Ensure coverage for ETA/status rules and UI state handling.

## Commit & Pull Request Guidelines

- Use conventional commit prefixes as seen in history (e.g. `docs: ...`).
- PRs should link the relevant `spec.md` and `plan.md` and include screenshots
  for UI changes.
- Call out any changes to contracts or environment configuration.

## Security & Configuration Tips

- Treat MapTiler API keys and any feed credentials as secrets; never commit
  them to the repo.
- Do not log or store any personal data.