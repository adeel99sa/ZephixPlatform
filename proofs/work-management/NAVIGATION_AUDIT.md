# Navigation Audit - Programs and Portfolios Entry Points

## Routes in App.tsx

**File:** `zephix-frontend/src/App.tsx`

**Lines 119-122:**
```tsx
<Route path="/workspaces/:workspaceId/programs" element={<ProgramsListPage />} />
<Route path="/workspaces/:workspaceId/programs/:programId" element={<ProgramDetailPage />} />
<Route path="/workspaces/:workspaceId/portfolios" element={<PortfoliosListPage />} />
<Route path="/workspaces/:workspaceId/portfolios/:portfolioId" element={<PortfolioDetailPage />} />
```

## Sidebar Navigation Links

**File:** `zephix-frontend/src/components/shell/Sidebar.tsx`

**Lines 337-354:** Main workspace navigation section
```tsx
{/* PHASE 6 MODULE 6: Portfolios and Programs navigation */}
<NavLink
  data-testid="ws-nav-portfolios"
  to={`/workspaces/${activeWorkspaceId}/portfolios`}
  className={({ isActive }) => ...}
>
  Portfolios
</NavLink>
<NavLink
  data-testid="ws-nav-programs"
  to={`/workspaces/${activeWorkspaceId}/programs`}
  className={({ isActive }) => ...}
>
  Programs
</NavLink>
```

**Lines 386-392:** Mobile menu section
```tsx
Portfolios
Programs
```

## Other Entry Points

**File:** `zephix-frontend/src/pages/programs/ProgramsListPage.tsx`
- Line 197: Link to Portfolios page: `<Link to={`/workspaces/${wsId}/portfolios`}>`

## Summary

**Total Entry Points:**
1. Sidebar main nav (desktop) - Portfolios link
2. Sidebar main nav (desktop) - Programs link  
3. Sidebar mobile menu - Portfolios
4. Sidebar mobile menu - Programs
5. ProgramsListPage - "Manage Portfolios" button
6. Routes in App.tsx (4 routes total)

**Action Required:**
- Hide all sidebar links when feature flag is false
- Keep routes but they won't be accessible via UI navigation
- ProgramsListPage link to Portfolios should also be hidden
