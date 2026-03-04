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

npm run build in zephix-frontend

run gating tests if present
