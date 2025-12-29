# PHASE 2: MIGRATION-FIRST DEVELOPMENT RULE

## 🚨 Final Rule

**Never start controller work until migrations run clean in a fresh database.**

---

## Rationale

1. **Avoids Wasted Cycles**
   - Controllers built on broken schema can't be properly tested
   - Fixing migrations after controller work requires rework

2. **Prevents False Confidence**
   - Passing tests on stale schema don't prove correctness
   - Migration failures in production are costly

3. **Ensures Environment Consistency**
   - Dev, staging, and prod must have identical schema
   - Migration drift causes deployment failures

4. **Catches Issues Early**
   - Migration problems block all developers
   - Fixing early prevents cascade of broken work

---

## Enforcement

### Before Starting Any Controller/Service Work:

1. **Run migrations in fresh database:**
   ```bash
   cd zephix-backend
   npm run migration:run
   ```

2. **Verify all migrations pass:**
   - Check for errors
   - Verify tables created
   - Verify indexes created
   - Verify data seeded (if applicable)

3. **Only then proceed to controllers/services**

### If Migrations Fail:

1. **Stop all controller/service work**
2. **Fix migration issues first**
3. **Re-run migrations until clean**
4. **Then resume controller/service work**

---

## Phase 2 Application

### ✅ Correct Sequence Applied:

1. **Pre-flight:** Fixed migration drift (`deleted_at` column issue)
2. **Migrations:** All 3 migrations executed successfully
3. **Then:** Built controllers and services on stable schema

### ✅ Results:

- No wasted cycles on broken schema
- All tests pass on correct schema
- Ready for deployment without migration surprises

---

## Going Forward

**Always:**
- Run `npm run migration:run` in fresh DB before controller work
- Fix migration failures immediately
- Verify schema matches entity definitions

**Never:**
- Start controllers with failing migrations
- Assume migrations will "work later"
- Skip migration verification

---

**This rule prevents the exact blocker we encountered and fixed in Phase 2.**




