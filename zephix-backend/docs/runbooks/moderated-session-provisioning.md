# Runbook — Moderated session provisioning (STAGING)

Provision 5 clean tester orgs for moderated usability sessions on one gate.
Do the **dry-run first, every time.**

> Nothing here was executed against staging when it was written. The scripts
> default to dry-run and the smoke key is never printed. Read the WARNINGS.

---

## What each tester gets

A `GOVERNED` workspace with a Waterfall project already instantiated (all 5
phase gates armed), one task **"Draft project charter"** in the gated Initiation
phase, and a **distinct pre-pinned approver account** (`approver-0N`) that you
log into to approve. The tester's first move is trying to mark that task Done →
they hit `GOVERNANCE_RULE_BLOCKED` (HTTP 400), then try to approve the gate
themselves → `SELF_APPROVAL_FORBIDDEN` (GOVERNED blocks self-approval) → **you,
signed in as `approver-0N`, approve it live.** That is the whole demo: the block,
and separation of duties.

### Why a distinct approver per org (and not you switching orgs)

To approve a tester's gate, the approver's JWT must be scoped to that tester's
org, and that org comes from the user's **primary org at login** — a single
identity has one primary org at a time. So one shared facilitator would have to
`set-primary-org` + re-login **between every session, mid-call**. Instead the
script creates one approver per org and **pins it at provision time**. On session
day you just sign in as `approver-0N` and click Approve — zero org-switching.

---

## Prerequisites

1. **Smoke key** — never paste it into a chat or a file:
   ```
   export SMOKE_KEY="$(railway variables -s zephix-backend-staging -e staging --json | python3 -c 'import sys,json;print(json.load(sys.stdin)["STAGING_SMOKE_KEY"])')"
   ```
2. Railway CLI logged in; `python3` on PATH.

That's it — the script creates both the tester and the approver accounts, so
there is **no facilitator id to look up** anymore.

---

## Step 1 — Dry-run (mandatory)

Prints every call it would make (key redacted); creates nothing.

```
cd zephix-backend
./scripts/session-provision.sh
```

**Expected:** per org (`SESSION-01 … 05`) the full call list — tester create →
login → workspace → GOVERNED → approver create → invite → accept → **pin approver
to org** → add member → instantiate Waterfall → create task — and a summary table
of placeholder ids. No mutations. If anything looks wrong, stop and fix flags.

## Step 2 — Execute

```
./scripts/session-provision.sh --no-dry-run
```

**Expected:** each org logs `✓ SESSION-0N provisioned`. On any unexpected HTTP
status the script STOPS (never half-provisions) and prints the failing call with
the key redacted. Every id is logged as created, so a partial run is recoverable
— re-running SKIPS orgs that already have the `Delivery` workspace (idempotent).

**Output:** a summary table on screen **and** in
`session-provision-SESSION-<date>.txt` — one row per session with the
**tester** and **approver** logins:

```
org         tester_email           tester_pw       approver_email          approver_pw     workspace_id  project_id  task_id
SESSION-01  session-01@zephix.dev  TesterPass123!  approver-01@zephix.dev  TesterPass123!  …             …           …
…
```

Session morning is not for scrolling a terminal — the file is the record.

## Step 3 — Paste into each calendar invite

> Sign in at **https://zephix-frontend-staging.up.railway.app** with the
> **tester** email/password from your row. Open the **Delivery** workspace →
> **Q3 Rollout** project → try to mark **Draft project charter** as Done.

(Keep the `approver-0N` credentials for yourself — those are how you approve.)

---

## Session day — approving as the facilitator (the SoD moment)

No org-switching, no curl. Per session:

1. The **tester** (their own connection) marks the task Done → hits the block →
   tries to approve → is denied (`SELF_APPROVAL_FORBIDDEN`). That is the SoD
   moment landing on screen.
2. **You**, in a **separate browser or profile**, sign in as the matching
   **`approver-0N`** for that session and **Approve** the gate. Done.

Use a different browser profile (or incognito) for the approver so you are not
fighting the tester's session cookie. Have the five approver logins from the
summary file open before the first call.

---

## ⚠️ WARNINGS — read before the first session

- **FREEZE MERGES during sessions.** Staging auto-deploys on every merge to
  `staging` (backend and the Cursor frontend lane). A merge mid-call lands a
  deploy and can bounce a session. Announce a merge freeze on both lanes for the
  session window.
- **Remote, one tester per connection.** Auth endpoints are IP-rate-limited
  (5 login attempts / 15 min per IP; SEC-3 Redis throttle on failed logins).
  Five people behind one office IP can rate-limit each other out. Each tester
  joins from their own network. (Provisioning uses the smoke path, which bypasses
  the limiter — this warning is about the *testers* and *you* logging into the UI.)
- **@zephix.dev only.** Tester and approver accounts use `…@zephix.dev` because
  that domain is on the staging email-verification bypass allowlist. A real
  corporate email would dead-end at verification (SendGrid is dormant). A staging
  affordance, not the product's real signup.

---

## Afterwards — teardown

Do not leave ten more orgs (five tester + five approver-home) on a 238-org shared
staging DB. There is **no org-delete endpoint**, so teardown is a reviewed manual
SQL step — the script generates it, you run it.

```
./scripts/session-teardown.sh --prefix SESSION
```

Prints a read-only preview SELECT (blast radius) and writes a scoped
`session-teardown-SESSION-<date>.sql` with **A: soft-disable** (`status='inactive'`,
reversible, recommended) and **B: hard delete in FK order** — both with `COMMIT`
commented out. Review it, run the preview, then run your chosen block in psql. The
script never deletes anything itself.

> Note: the approver accounts' throwaway *home* orgs are named
> `SESSION-0N-approver-home` — also matched by the `SESSION-%` prefix, so the same
> teardown covers them.
