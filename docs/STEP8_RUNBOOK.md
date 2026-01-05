# Step 8: Sharing and Permissions - Runbook

## How to Run Backend Locally

```bash
cd zephix-backend
npm run migration:run
npm run start:dev
```

## How to Run Frontend Locally

```bash
cd zephix-frontend
npm run dev
```

## How to Run Backend Smoke Script

```bash
export BASE="http://localhost:3000"
export TOKEN="your-jwt-token"
export WORKSPACE_ID="your-workspace-uuid"
export DASHBOARD_ID="your-dashboard-uuid"
bash scripts/step8-backend-smoke.sh
```

## Troubleshooting

- **Missing workspace header yields 403**: Ensure `x-workspace-id` header is included in authenticated requests
- **Share token missing**: Enable share route response shape changed, check `.data.shareToken` or `.data.token` path
- **Public fetch returns 401**: `OptionalJwtAuthGuard` is not allowing unauthenticated access, check guard implementation
- **Templates or share routes return 404**: Route order or controller registration order issue, ensure static routes before `:id` routes

