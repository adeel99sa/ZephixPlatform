# Auth Module Ownership Rule

## Rule: No Direct Controller Dependency Additions Without Module Provider Updates

### Purpose
Prevent DI failures by ensuring all controller dependencies are properly registered in `AuthModule`.

### Scope
Applies to:
- `src/modules/auth/auth.controller.ts`
- `src/modules/auth/controllers/*.controller.ts`
- Any controller that injects services used by auth controllers

### Rule

**When adding a new service dependency to any auth controller:**

1. **Check if service exists in `AuthModule.providers`:**
   ```typescript
   // Open: src/modules/auth/auth.module.ts
   // Verify service is in providers array
   ```

2. **If service is missing:**
   - Add service to `providers` array
   - Ensure service is `@Injectable()`
   - Ensure all service dependencies are available (entities in `TypeOrmModule.forFeature`, etc.)

3. **If service is in a different module:**
   - Import that module into `AuthModule`
   - OR export service from its module and import that module
   - OR move service to `AuthModule` if it's auth-specific

4. **Verify before committing:**
   ```bash
   npm run build
   npm run test:smoke
   npm run guard:deploy
   ```

### Examples

#### ✅ CORRECT: Service in providers
```typescript
// auth.controller.ts
constructor(
  private readonly authService: AuthService, // ✅ In providers
  private readonly authRegistrationService: AuthRegistrationService, // ✅ In providers
) {}
```

#### ❌ WRONG: Service not in providers
```typescript
// auth.controller.ts
constructor(
  private readonly newService: NewService, // ❌ Not in providers!
) {}
```

#### ✅ FIX: Add to providers
```typescript
// auth.module.ts
providers: [
  AuthService,
  AuthRegistrationService,
  NewService, // ✅ Added
],
```

### Enforcement

- **Pre-commit:** `npm run guard:deploy` must pass
- **CI:** `guard:deploy` job blocks merge if it fails
- **Code Review:** Reviewers must verify `AuthModule.providers` includes all controller dependencies

### Checklist for Auth Controller Changes

- [ ] All injected services are in `AuthModule.providers`
- [ ] All service dependencies (repositories, etc.) are in `TypeOrmModule.forFeature`
- [ ] `npm run build` passes
- [ ] `npm run test:smoke` passes
- [ ] `npm run guard:deploy` passes

---

**Last Updated:** 2025-12-29  
**Owner:** Backend Team  
**Review Required:** Yes, for any auth module changes

