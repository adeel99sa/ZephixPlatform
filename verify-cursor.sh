set -euo pipefail
echo "== Files exist =="
for f in \
  zephix-frontend/src/App.tsx \
  zephix-frontend/src/components/layouts/DashboardLayout.tsx \
  zephix-frontend/src/components/header/UserMenu.tsx \
  zephix-frontend/src/components/header/WorkspaceSwitcher.tsx \
  zephix-frontend/src/components/header/GlobalCreate.tsx \
  zephix-frontend/src/state/AuthContext.tsx \
  zephix-frontend/src/routes/ProtectedRoute.tsx
do [ -f "$f" ] && echo "✓ $f" || (echo "✗ $f missing"; exit 1); done

echo "== Required patterns =="
grep -n "<Outlet" zephix-frontend/src/components/layouts/DashboardLayout.tsx
grep -n "BrowserRouter" zephix-frontend/src/App.tsx
grep -n 'data-testid="workspace-switcher-button\|global-create-button\|user-menu-button"' zephix-frontend/src

echo "== Build frontend =="
( cd zephix-frontend && npm run build )

echo "== Route dump (backend) =="
grep -n "Mapped {/.+}" zephix-backend -r || true
