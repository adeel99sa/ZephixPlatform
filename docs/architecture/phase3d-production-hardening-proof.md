# Phase 3D — Production Hardening & Observability — Proof Document

## Summary

Phase 3D adds operational maturity to Zephix. No new product features—pure reliability,
enterprise security review readiness, and production observability.

---

## What Was Built

| Step | Deliverable | Status |
|------|-------------|--------|
| 1 | Global Error Taxonomy (`ErrorCode` enum, `AppException`, `STATUS_TO_ERROR_CODE`) | Done |
| 2 | Request Correlation ID (NestJS middleware, `X-Request-Id` propagation) | Done |
| 3 | Structured Logging (`AppLogger` wrapper with enforced `LogContext`) | Done |
| 4 | Rate Limiting Normalization (centralized tiers, plan-aware guard) | Done |
| 5 | Health & Metrics Surface (`GET /metrics/system` — admin only) | Done |
| 6 | Audit Export Endpoint (`GET /audit/export` — CSV streaming) | Done |
| 7 | Security Headers Hardening (HSTS, CSP, X-Frame, Referrer-Policy, Permissions-Policy) | Done |
| 8 | Backup Readiness Proof (`GET /admin/system/backup-readiness`) | Done |

---

## Files Created

| File | Purpose |
|------|---------|
| `src/shared/errors/error-codes.ts` | Canonical error code enum + status mapping |
| `src/shared/errors/app-exception.ts` | Typed `HttpException` subclass with mandatory `code` |
| `src/shared/middleware/request-correlation.middleware.ts` | NestJS middleware for X-Request-Id |
| `src/shared/middleware/security-headers.middleware.ts` | Enterprise security headers middleware |
| `src/shared/logging/app-logger.ts` | Structured logger wrapper |
| `src/shared/guards/rate-limit.config.ts` | Centralized rate limit tier definitions |
| `src/shared/guards/plan-rate-limit.guard.ts` | Plan-aware rate limiter guard + `@PlanRateLimit` decorator |
| `src/shared/controllers/metrics.controller.ts` | System metrics endpoint (admin only) |
| `src/shared/controllers/backup-readiness.controller.ts` | Backup readiness check (admin only) |
| `src/shared/production-hardening.module.ts` | Module registration for Phase 3D components |

## Files Modified

| File | Change |
|------|--------|
| `src/shared/filters/api-error.filter.ts` | Use canonical `STATUS_TO_ERROR_CODE`, include metadata from `AppException`, structured error logging |
| `src/modules/audit/controllers/audit.controller.ts` | Added `GET /audit/export` CSV streaming endpoint |
| `src/app.module.ts` | Import `ProductionHardeningModule`, register `RequestCorrelationMiddleware` and `SecurityHeadersMiddleware` |

---

## Endpoint Table

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| GET | `/metrics/system` | Platform ADMIN | Aggregate system metrics |
| GET | `/audit/export` | Platform ADMIN | CSV export of audit events (max 90-day window) |
| GET | `/admin/system/backup-readiness` | Platform ADMIN | Backup and disaster recovery readiness check |

Pre-existing health endpoints (unchanged):
| GET | `/health/live` | Public | Liveness probe |
| GET | `/health/ready` | Public | Readiness probe |

---

## Error Taxonomy

All API errors now return `{ code, message }`. Canonical codes:

```
AUTH_UNAUTHORIZED, AUTH_FORBIDDEN, ENTITLEMENT_REQUIRED, PLAN_INACTIVE,
QUOTA_EXCEEDED, STORAGE_LIMIT_EXCEEDED, PROJECT_LIMIT_EXCEEDED,
PORTFOLIO_LIMIT_EXCEEDED, SCENARIO_LIMIT_EXCEEDED, ATTACHMENT_EXPIRED,
ATTACHMENT_PENDING, VALIDATION_ERROR, WIP_LIMIT_EXCEEDED, BASELINE_LOCKED,
CONFLICT, NOT_FOUND, RATE_LIMITED, INTERNAL_ERROR, SERVICE_UNAVAILABLE
```

`AppException` usage:
```typescript
throw new AppException(ErrorCode.QUOTA_EXCEEDED, 'Project limit reached', 403);
throw new AppException(ErrorCode.STORAGE_LIMIT_EXCEEDED, 'Storage full', 403, { usedBytes, limitBytes });
```

---

## Rate Limit Tiers

| Tier | Window | Base Max | Description |
|------|--------|----------|-------------|
| standard | 60s | 30 | Most API endpoints |
| compute | 60s | 5 | Scenario compute, capacity leveling, portfolio analytics |
| storage | 60s | 20 | Presign, upload complete |
| auth | 900s | 5 | Login, register, refresh |
| admin | 60s | 10 | Admin operations |

Base max is multiplied by org's `api_rate_multiplier` from entitlements:
- FREE: 1x → 30 req/min standard
- TEAM: 2x → 60 req/min standard
- ENTERPRISE: 10x → 300 req/min standard

---

## Security Headers

Applied to all responses via `SecurityHeadersMiddleware`:

| Header | Value |
|--------|-------|
| Strict-Transport-Security | max-age=31536000; includeSubDomains |
| X-Content-Type-Options | nosniff |
| X-Frame-Options | DENY |
| Referrer-Policy | strict-origin-when-cross-origin |
| Content-Security-Policy | default-src 'none'; frame-ancestors 'none' |
| Permissions-Policy | camera=(), microphone=(), geolocation=(), payment=() |

---

## Request Correlation

- Middleware generates UUID if client does not send `X-Request-Id`
- Propagated to: response header, `req.id`, `req.requestId`
- Available to: logger context, audit metadata, error responses
- SOC teams can trace any request end-to-end

---

## Audit Export

- `GET /audit/export?from=&to=` — CSV streaming
- Max 90-day window enforced
- Paginated at 500 rows per batch (no memory loading)
- Columns: id, created_at, organization_id, workspace_id, actor_user_id, actor_platform_role, entity_type, entity_id, action, metadata
- Content-Disposition with date-range filename

---

## Test Results

### Phase 3D New Tests: 82

| Suite | Tests | Status |
|-------|-------|--------|
| error-codes.spec.ts | 27 | PASS |
| request-correlation.spec.ts | 8 | PASS |
| security-headers.spec.ts | 7 | PASS |
| plan-rate-limit.spec.ts | 13 | PASS |
| app-logger.spec.ts | 5 | PASS |
| metrics.controller.spec.ts | 5 | PASS |
| backup-readiness.controller.spec.ts | 4 | PASS |
| audit-export.spec.ts | 9 | PASS |
| api-error-filter.spec.ts | 9 | PASS |

### Regression Check

| Scope | Suites | Tests | Result |
|-------|--------|-------|--------|
| attachment + billing + entitlement + audit + work-management + capacity + scenario + portfolio + baseline | 64 | 644 | All PASS |

### Full Suite

| Metric | Baseline (pre-3D) | After 3D | Delta |
|--------|-------------------|----------|-------|
| Passing suites | 97 | 106 | +9 |
| Passing tests | 930 | 1016 | +86 |
| Failing suites | 22 | 22 | 0 (pre-existing) |

---

## Compilation

```
Backend:  npx tsc --noEmit → exit 0
Frontend: npx tsc --noEmit → exit 0
```

---

## Enterprise Security Review Readiness

Phase 3D answers these questions that enterprise buyers will ask:

| Question | Answer |
|----------|--------|
| "Where are your health checks?" | `/health/live` (liveness), `/health/ready` (readiness with DB check) |
| "How do you trace a failed request?" | X-Request-Id correlation across logs, audit, and error responses |
| "How do we export audit logs?" | `GET /audit/export` — CSV streaming, admin only, 90-day max |
| "How do you throttle abuse?" | Plan-aware rate limiting with tiered configs × entitlement multiplier |
| "Show me your error taxonomy." | `ErrorCode` enum with 19 canonical codes, all responses include `code` |
| "What security headers do you set?" | HSTS, CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy |
| "Can we verify backup readiness?" | `GET /admin/system/backup-readiness` with migration, storage, audit, and DB checks |

---

## Cumulative Platform State After Phase 3D

| Layer | Capability |
|-------|-----------|
| Execution | Agile engine, Waterfall engine, CPM, baselines, earned value |
| Governance | Phase gates, WIP limits, role authority |
| Portfolio | Rollups, weighted CPI/SPI, critical path risk |
| Capacity | Time-phased demand/supply, overallocation detection, leveling |
| Simulation | What-if scenarios, before/after comparison |
| Attachments | Presigned upload, retention, metering, audit |
| Monetization | Plan model, entitlement registry, quotas, feature gating |
| Compliance | Immutable audit trail, CSV export, sanitization |
| Operations | Error taxonomy, request tracing, rate limiting, health probes, metrics, security headers |
