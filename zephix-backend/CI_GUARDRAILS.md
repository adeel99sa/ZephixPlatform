# CI Guardrails - req.user Refactor

## ESLint Rule Configuration

### Rule Status
- **Level:** `error` (blocks CI on violations)
- **Pattern:** Bans direct `req.user` access in controllers
- **Enforcement:** All controller files (`**/*.controller.ts`)

### Rule Definition

```javascript
{
  selector: 'MemberExpression[object.name="req"][property.name="user"]',
  message: 'Direct req.user access is forbidden. Use getAuthContext(req) from common/http/get-auth-context.',
}
```

### Exclusions

**Helper Files (Allowed to use req.user):**
- `**/common/http/get-auth-context.ts`
- `**/common/http/get-auth-context-optional.ts`

**Infrastructure Directories:**
- `**/tenancy/**`
- `**/database/**`
- `**/migrations/**`
- `**/scripts/**`
- `**/config/**`

**Test Files:**
- `**/*.spec.ts`
- `**/*.test.ts`

### Verification

```bash
# Check for violations
npm run lint | grep "Direct req.user access"

# Expected: No output (0 violations)
```

---

## CI Pipeline Configuration

### Required Pipeline Steps

1. **Lint** (must run before build)
2. **Build** (TypeScript compilation)
3. **Unit Tests**
4. **E2E Tests** (if applicable)

### Lint as Blocking Step

**✅ Current State:** Lint runs before build and fails on any error

**Required Behavior:**
- Lint step must fail the pipeline if ESLint reports any errors
- No warnings allowed for `req.user` violations
- Build step should not execute if lint fails

### Example CI Configuration

```yaml
# .github/workflows/ci.yml (example)
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
        # This step fails on any ESLint error

  build:
    needs: lint  # Build only runs if lint passes
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
```

---

## Maintenance Rules

### ✅ DO
- Keep ESLint rule at `error` level
- Only exclude helper files (`get-auth-context*.ts`)
- Run lint before build in CI
- Fail CI on any ESLint error

### ❌ DON'T
- Lower rule severity to `warn`
- Add broad exclusions (e.g., entire directories)
- Allow lint to pass with errors
- Skip lint step in CI

---

## Regression Prevention

### How It Works

1. **Developer writes code:**
   ```typescript
   const userId = req.user.id; // ❌ ESLint error
   ```

2. **ESLint catches violation:**
   ```
   error: Direct req.user access is forbidden. Use getAuthContext(req)
   ```

3. **CI fails:**
   - Lint step fails
   - Build step doesn't run
   - PR cannot be merged

4. **Developer fixes:**
   ```typescript
   const { userId } = getAuthContext(req); // ✅ Passes
   ```

### Verification Commands

```bash
# Local verification (before commit)
npm run lint

# CI verification (automatic)
# Runs in GitHub Actions / CI pipeline
```

---

## Current Status

- ✅ ESLint rule active at error level
- ✅ Helper files excluded
- ✅ Test files excluded
- ✅ Infrastructure directories excluded
- ✅ 0 violations in codebase
- ✅ CI configured to block on lint errors

---

## Monitoring

### Regular Checks

1. **Weekly:** Run `npm run lint` and verify 0 violations
2. **Per PR:** CI automatically checks
3. **On Merge:** CI must pass before merge

### Alert Triggers

- Any new `req.user` violation in PR
- ESLint rule disabled or lowered
- CI lint step skipped or made non-blocking

---

## Support

If you encounter issues:

1. **False Positive:** Check if file should be excluded
2. **Legitimate Use Case:** Use `getAuthContext()` or `getAuthContextOptional()`
3. **Helper File:** Ensure it's in the exclusion list

---

**Last Updated:** After req.user refactor completion
**Status:** ✅ Locked and enforced

