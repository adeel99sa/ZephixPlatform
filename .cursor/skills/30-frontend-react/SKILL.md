Name
frontend-react

Description
Use for React tabs, routes, api modules, api client wrappers, and workspace context wiring.

Instructions

Reuse existing api modules before creating new ones.

Never hardcode workspaceId. Pull from workspace store or route context.

Do not attach auth headers manually if api client handles it.

Fix only imports and callsites unless UI bug is proven.

Overlays and popovers
- All overlays, popovers, dropdowns, and modals must portal to `document.body` with `position: fixed` and `z-index` ≥ 50.
- Never render absolutely-positioned panels inside `<table>` / `<th>` / scroll containers — fixed backdrops (e.g. `z-20`) will paint above them and swallow clicks.
- Precedent: Mode E (Sprint 5.2a `ColumnHeaderMenu`) and WAVE 1 Track A `AttributeColumnPanel` — same failure class.

Validation

cd zephix-frontend && npm run typecheck && npm run build && npm run lint:new && npm run test:gating

typecheck + test:gating required before push — vite build alone does not match CI C1 Gates (see docs/ai/reference_typescript_pitfalls.md, docs/ai/reference_gating_floor.md)

when deleting test files: add replacement gating entries in the same commit; update GATING_FILE_FLOOR

run gating tests if present
