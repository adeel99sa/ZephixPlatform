# CSRF Flow — Canonical Pattern for Smoke Tests

**Audience:** anyone writing or maintaining a `scripts/smoke/*.sh` script that exercises a mutating endpoint (`POST` / `PATCH` / `DELETE`).

**Status:** Locked 2026-05-09 as the canonical pattern after the B1 e2e smoke surfaced a CSRF gap on `POST /invitations/:token/accept`.

---

## 1. Background

This codebase enforces CSRF protection on **every** mutating endpoint, regardless of whether the endpoint is authenticated. The CSRF guard is registered in `modules/auth/auth.module.ts` as `CsrfGuard` and applies via the global guard chain ahead of `JwtAuthGuard`.

That means:

- `@Public()` and `@UseGuards(OptionalJwtAuthGuard)` skip JWT verification but **do not skip CSRF**.
- A `POST` / `PATCH` / `DELETE` request without `X-CSRF-Token` returns **`403 { code: 'CSRF_TOKEN_MISSING' }`** even if the route is fully anonymous.
- A `GET` request never requires CSRF (CSRF protects state-mutating verbs).

This is intentional — the double-submit cookie pattern guards against cross-origin form submissions even on token-bound public endpoints (an attacker on a phishing site can still submit a form to your domain unless CSRF is enforced).

The single exception class would be a true webhook endpoint signed by an external service (e.g., GitHub webhooks signed with HMAC). None ship in B1.

## 2. Flow diagram

```
┌──────────┐                                         ┌─────────┐
│  Smoke   │    1. GET /api/v1/auth/csrf            │  API    │
│  Script  │───────────────────────────────────────→│         │
│          │                                         │         │
│          │←──────────────────────────────────────  │         │
│          │  Set-Cookie: csrfToken=ABC123           │         │
│          │  Body: { csrfToken: "ABC123" }          │         │
│          │                                         │         │
│          │    2. Mutating request                  │         │
│          │       Cookie: csrfToken=ABC123          │         │
│          │       X-CSRF-Token: ABC123              │         │
│          │       Authorization: Bearer …           │         │
│          │       Body: {…}                         │         │
│          │───────────────────────────────────────→│         │
│          │                                         │         │
│          │←──────────────────────────────────────  │         │
│          │  201 / 200 / etc.                       │         │
└──────────┘                                         └─────────┘
```

The CSRF token is **double-submitted**: it must appear both as a cookie (set by the server on the GET) AND as the `X-CSRF-Token` request header on the mutating request. The server compares the two values; a mismatch or missing header fails CSRF.

## 3. Code example (bash + curl)

This is the load-bearing pattern for any new smoke script. Copy and adapt — do not invent a new flow.

```bash
BASE='https://zephix-backend-staging-staging.up.railway.app/api/v1'
COOKIE_JAR=$(mktemp)

# Step 1: acquire CSRF token + set cookie. -c stores the cookie in the jar.
CSRF_RESP=$(curl -s -c "$COOKIE_JAR" "$BASE/auth/csrf")
CSRF=$(echo "$CSRF_RESP" | python3 -c "import sys,json;d=json.loads(sys.stdin.read());print(d.get('data',{}).get('csrfToken') or d.get('csrfToken') or '')")
[ -z "$CSRF" ] && { echo "FAIL: no CSRF token"; exit 1; }

# Step 2: any mutating request — include both -b (cookie jar) AND -H X-CSRF-Token.
curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "X-CSRF-Token: $CSRF" \
  -H "Content-Type: application/json" \
  -d '{"foo":"bar"}' \
  -X POST "$BASE/some/mutating/endpoint"

# Cleanup
rm -f "$COOKIE_JAR"
```

For authenticated mutating requests, also include `-H "Authorization: Bearer $ACCESS_TOKEN"`. The CSRF cookie + header pair stays the same regardless of whether the route requires JWT.

## 4. CSRF-exempt endpoint list

Locked: there are **no CSRF-exempt mutating endpoints** in B1. All `POST` / `PATCH` / `DELETE` routes — public or authenticated — require the double-submit pair. Even the unauthenticated routes:

| Endpoint | Why CSRF still applies |
|---|---|
| `POST /api/v1/auth/login` | Cross-origin login form would let an attacker establish a session in the victim's browser. |
| `POST /api/v1/auth/register` | Same as login. |
| `POST /api/v1/auth/forgot-password` | Cross-origin replay would spam reset emails. |
| `POST /api/v1/auth/reset-password` | Token-bound but still CSRF-protected so a phishing form can't trigger reset on victim cookies. |
| `POST /api/v1/invitations/:token/accept` | Token-bound but still CSRF-protected so a phishing form can't auto-accept on a victim's authenticated session. (The "no auth" branch creates a new user; CSRF guards against drive-by signups.) |
| `POST /api/v1/auth/mfa/enroll` | Authenticated; standard CSRF. |
| `POST /api/v1/auth/mfa/verify` | Authenticated; standard CSRF. |
| `DELETE /api/v1/auth/mfa` | Authenticated; standard CSRF. |
| `POST /api/v1/org/users/invite` | Admin-authenticated; standard CSRF. |
| `PATCH /api/v1/org/users/:userId` | Admin-authenticated; standard CSRF. |
| `PATCH /api/v1/org/users/:userId/deactivate` | Admin-authenticated; standard CSRF. |
| `POST /api/v1/workspaces/:wsId/members/invite` | Owner-authenticated; standard CSRF. |
| `PATCH /api/v1/workspaces/:wsId/members/:userId` | Owner-authenticated; standard CSRF. |
| `DELETE /api/v1/workspaces/:wsId/members/:userId` | Owner-authenticated; standard CSRF. |

When the next build adds a webhook receiver or any other genuinely-CSRF-exempt route, **add a row to this table** with the explicit reason and link to the route handler. Do not add CSRF exemptions silently.

## 5. Adding new mutating endpoints — checklist

When you add a new endpoint that uses `POST` / `PATCH` / `DELETE`:

- [ ] Confirm `CsrfGuard` is in the global guard chain via `auth.module.ts` (it is, as of B1).
- [ ] If the endpoint is `@Public()` or `@UseGuards(OptionalJwtAuthGuard)`, **CSRF still applies**. Decide explicitly: accept the standard double-submit flow OR document the exemption with an explicit reason.
- [ ] If exempting from CSRF, add a row to §4 above with reason + link to handler. PR review must justify why the exemption is safe.
- [ ] Update or add a smoke script that exercises the endpoint. Use the canonical pattern in §3 — do not invent a new approach. CSRF token acquisition belongs at the top of any smoke script that mutates state.
- [ ] Add a contract test (in the controller's `*.spec.ts` or co-located integration spec) that asserts the response when `X-CSRF-Token` is absent matches the expected behavior: 403 `CSRF_TOKEN_MISSING` for guarded routes, success for documented exempt routes.

## 6. Why this doc exists

The B1 e2e smoke (PR2) failed step (f) with `403 CSRF_TOKEN_MISSING` because the smoke script POSTed to `/invitations/:token/accept` without first acquiring a CSRF token. The route is `@Public()` so the smoke author (me) assumed CSRF didn't apply. It did. The operator required this doc as part of the hotfix cycle so the next build doesn't repeat the gap.

The lesson, written down once: `@Public()` skips JWT but **never** CSRF. Unless explicitly documented in §4 above, every mutating smoke step starts with `GET /api/v1/auth/csrf`.

---

## Document control

| Field | Value |
|---|---|
| Created | 2026-05-09 (B1 hotfix cycle) |
| Source dispatch | docs/builds/build1-rbac-reconciled-spec.md ; operator dispatch 2026-05-09 |
| Updates | Add a row to §4 when adding a CSRF-exempt route. Update §5 checklist if the guard chain composition changes. |
