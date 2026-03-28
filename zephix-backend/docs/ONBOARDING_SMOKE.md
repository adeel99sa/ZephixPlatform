# Onboarding Smoke Checks

Run these with a valid `TOKEN`. Use `WORKSPACE_ID` from workspace create and
`PROJECT_ID` from project create.

```bash
curl -s -X POST "$API_BASE/workspaces" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Onboarding Workspace","slug":"onboarding-workspace"}'
```

```bash
curl -s -X POST "$API_BASE/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: $WORKSPACE_ID" \
  -d '{"name":"Onboarding Project","workspaceId":"'"$WORKSPACE_ID"'"}'
```

```bash
curl -s -X POST "$API_BASE/work-items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: $WORKSPACE_ID" \
  -d '{"title":"First work item","workspaceId":"'"$WORKSPACE_ID"'","projectId":"'"$PROJECT_ID"'"}'
```
