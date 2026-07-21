# Runbook — Moderated session provisioning (STAGING)

Provision 5 clean tester orgs for moderated usability sessions on one gate.
Written for session morning. Do the **dry-run first, every time.**

> Nothing here was executed against staging when it was written. The scripts
> default to dry-run and the smoke key is never printed. Read the WARNINGS.

---

## What each tester gets

A `GOVERNED` workspace with a Waterfall project already instantiated (all 5
phase gates armed), one task **"Draft project charter"** in the gated Initiation
phase, and **you (the facilitator) as a second approver**. The tester's first
move is trying to mark that task Done → they hit `GOVERNANCE_RULE_BLOCKED`
(HTTP 400), then try to approve the gate themselves → `SELF_APPROVAL_FORBIDDEN`
(GOVERNED blocks self-approval) → **you approve live on the call.** That is the
whole demo: the block, and separation of duties.

---

## Prerequisites (have these ready before you start)

1. **Smoke key** — never paste it into a chat or a file:
   ```
   railway variables -s zephix-backend-staging -e staging --json \
     | python3 -c "import sys,json;print(json.load(sys.stdin)['STAGING_SMOKE_KEY'])"
   ```
   Capture it into a shell variable in a terminal you trust:
   ```
   export SMOKE_KEY="$(railway variables -s zephix-backend-staging -e staging --json | python3 -c 'import sys,json;print(json.load(sys.stdin)["STAGING_SMOKE_KEY"])')"
   ```

2. **A facilitator account** — an existing **@zephix.dev** user who will approve
   the gates (e.g. `sandbox.admin@zephix.dev`, or your own zephix.dev account).
   It must be @zephix.dev (smoke-login and the invite-token path are
   domain-allowlisted).

3. **The facilitator's user id** — run this yourself:
   ```
   railway run -s Postgres -e staging -- bash -c \
     'psql "$DATABASE_PUBLIC_URL" -c "SELECT id, email FROM users WHERE email='"'"'you@zephix.dev'"'"';"'
   ```

4. Node/railway CLI logged in; `python3` on PATH.

---

## Step 1 — Dry-run (mandatory)

Prints every call it would make (key redacted); creates nothing.

```
cd zephix-backend
./scripts/session-provision.sh \
  --facilitator-email you@zephix.dev \
  --facilitator-id <facilitator-uuid>
```

**Expected:** a numbered list of the calls per tester (`SESSION-01 … 05`) —
smoke create → smoke-login → create workspace → set GOVERNED → invite facilitator
→ accept → add member → instantiate Waterfall → create task — and a summary table
of placeholder ids. No mutations. If any line looks wrong, stop and fix flags.

## Step 2 — Execute

```
./scripts/session-provision.sh \
  --facilitator-email you@zephix.dev \
  --facilitator-id <facilitator-uuid> \
  --no-dry-run
```

**Expected:** each org logs `✓ SESSION-0N provisioned`. On any unexpected HTTP
status the script STOPS (it does not continue half-provisioned) and prints the
failing call with the key redacted. Every created id is logged as it happens, so
a partial run is recoverable — re-running SKIPS orgs that already have the
`Delivery` workspace (idempotent).

**Output:** a summary table on screen **and** written to
`session-provision-SESSION-<date>.txt`:

```
org         login_email               password         workspace_id  project_id  task_id
SESSION-01  session-01@zephix.dev      TesterPass123!   …             …           …
…
```

Session morning is not the time to scroll a terminal — the file is the record.

## Step 3 — Paste into each calendar invite

> Sign in at **https://zephix-frontend-staging.up.railway.app** with the email
> and password from your row. Open the **Delivery** workspace → **Q3 Rollout**
> project → try to mark **Draft project charter** as Done.

---

## Session day — approving as the facilitator (the SoD moment)

Gate eligibility reads `platformRole` from your **primary org at login**. So to
approve in a tester's org you must switch to it **and re-login**, per session:

```
# 1. point your facilitator account at THIS tester's org
curl -s -H "X-Smoke-Key: $SMOKE_KEY" -H 'Content-Type: application/json' \
  -X POST "https://zephix-backend-staging-staging.up.railway.app/api/smoke/users/set-primary-org" \
  -d '{"email":"you@zephix.dev","orgId":"<that tester org id>"}'
# 2. re-login (smoke-login) so your new JWT carries ADMIN for that org, THEN approve in the UI.
```

The tester's org id is in the DB (`SELECT id FROM organizations WHERE name='SESSION-0N'`)
— capture the five up front so you're not looking them up mid-call.

---

## ⚠️ WARNINGS — read before the first session

- **FREEZE MERGES during sessions.** Staging auto-deploys on every merge to
  `staging` (both the backend and the Cursor frontend lane). A merge mid-call
  lands a deploy and can bounce a tester's session. Announce a merge freeze on
  both lanes for the session window.
- **Remote, one tester per connection.** Auth endpoints are IP-rate-limited
  (5 login attempts / 15 min per IP; SEC-3 Redis throttle on failed logins).
  Five people behind one office IP can rate-limit each other out. Each tester
  must join from their own network. (The provisioning itself uses the smoke
  path, which bypasses the limiter — this warning is about the *testers* logging
  into the UI.)
- **@zephix.dev only.** Tester accounts use `session-0N@zephix.dev` because that
  domain is on the staging email-verification bypass allowlist. A real corporate
  email would dead-end at verification (SendGrid is dormant). This is a staging
  affordance, not the product's real signup.

---

## Afterwards — teardown

Do not leave five more orgs on a 238-org shared staging DB. There is **no
org-delete endpoint**, so teardown is a reviewed manual SQL step — the script
generates it, you run it.

```
./scripts/session-teardown.sh --prefix SESSION
```

Prints a read-only preview SELECT (blast radius) and writes a scoped
`session-teardown-SESSION-<date>.sql` with two options — **A: soft-disable**
(`status='inactive'`, reversible, recommended) and **B: hard delete in FK order**
— both with `COMMIT` commented out. Review it, run the preview, then run your
chosen block in psql. The script never deletes anything itself.
