---
name: reference-typescript-pitfalls
description: TypeScript and React strict-mode pitfalls encountered on Zephix frontend work. Complements reference_github_api_quirks.md.
metadata:
  type: reference
---

# TypeScript / React pitfalls (Zephix frontend)

## Pre-push verification: `build` ≠ `typecheck`

CI **C1 Gates** runs `npm run typecheck` (`tsc -p tsconfig.app.json --noEmit`). Vite `npm run build` does not enforce the same strict compile.

**Required before every frontend PR push:**

```bash
cd zephix-frontend
npm run typecheck   # strict tsc --noEmit — must pass
npm run build       # vite build
npm run lint:new    # changed files only (repo CI convention)
```

`typecheck` is defined in `zephix-frontend/package.json`. Do not report "build pass" as CI-ready without `typecheck`.

Discovered: Sprint 5.2a Phase 1 PR #311 (2026-05-24).

---

## Pattern 1: `??` with non-array fallback before array methods

**Bug:** If `r.enumValues` is a truthy non-array (e.g. `{}`) while `enum_values` is an array, `Array.isArray(a ?? b)` can be true but `(a ?? b).filter(...)` still picks `a`.

```typescript
// Wrong
const enumValues = Array.isArray(r.enumValues ?? r.enum_values)
  ? (r.enumValues ?? r.enum_values as unknown[]).filter(...)
  : undefined;

// Right — extract, then verify shape
const rawEnum = r.enumValues ?? r.enum_values;
const enumValues = Array.isArray(rawEnum)
  ? rawEnum.filter((x): x is string => typeof x === 'string')
  : undefined;
```

Apply in all snake_case-tolerant mappers for optional array fields.

---

## Pattern 2: `useRef<T | null>(null)` vs JSX `ref` type

**Bug:** `useRef<HTMLDivElement | null>(null)` yields `RefObject<HTMLDivElement | null>` which does not assign to `LegacyRef<HTMLDivElement>` under strict mode.

**Canonical (InboxPage, use-resizable-split):**

```typescript
const splitRef = useRef<HTMLDivElement>(null);
// type: RefObject<HTMLDivElement>
```

Use for any DOM element ref passed to JSX `ref` in React 18+ / strict TypeScript.

---

## Related

- `docs/ai/reference_github_api_quirks.md` (operator memory; ruleset PUT vs PATCH)
- `docs/ai/CURSOR_RUNBOOK_TEMPLATE.md` — Step 5 frontend validation
- `.cursor/skills/30-frontend-react/SKILL.md`
