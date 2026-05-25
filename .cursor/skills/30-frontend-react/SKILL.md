Name
frontend-react

Description
Use for React tabs, routes, api modules, api client wrappers, and workspace context wiring.

Instructions

Reuse existing api modules before creating new ones.

Never hardcode workspaceId. Pull from workspace store or route context.

Do not attach auth headers manually if api client handles it.

Fix only imports and callsites unless UI bug is proven.

Validation

cd zephix-frontend && npm run typecheck && npm run build && npm run lint:new && npm run test:gating

typecheck + test:gating required before push — vite build alone does not match CI C1 Gates (see docs/ai/reference_typescript_pitfalls.md, docs/ai/reference_gating_floor.md)

when deleting test files: add replacement gating entries in the same commit; update GATING_FILE_FLOOR

run gating tests if present
