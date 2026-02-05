# Message to Send to Tester

---

**Subject:** Zephix Workspace Testing - Test Accounts & Instructions

Hi [Tester Name],

You will test Zephix workspace behavior. Use the accounts and steps in the attached documents.

## Test Accounts

- **Admin:** `tester-admin@zephix.ai` / `Test123!@#`
- **Member:** `tester-member@zephix.ai` / `Test123!@#`
- **Viewer:** `tester-viewer@zephix.ai` / `Test123!@#`

## Documents

Please review these documents in order:

1. **SETUP_TESTER_ENVIRONMENT.md** - Environment setup and account information
2. **TESTER_WORKSPACE_SCRIPT.md** - Step-by-step testing script (follow this)
3. **VERIFICATION_CHECKLIST.md** - Quick verification checklist
4. **TESTER_FOCUS_AREAS.md** - Explicit focus areas and red flags
5. **BUG_REPORT_TEMPLATE.md** - Use this for reporting issues

## Focus Areas

See **TESTER_FOCUS_AREAS.md** for detailed focus instructions.

**Quick summary:**

### Admin (tester-admin)
- ✅ Workspace creation works
- ✅ Empty workspace shows correct empty state
- ✅ Ownership and member roles match the script
- ✅ Last owner protection behaves as described

### Member and Viewer
- ❌ No workspace creation entry point
- ✅ Access rights match the script
- ❌ No "owner" controls for non-owners

## Critical Bugs to Report (Red Flags)

Report these immediately:

- **Any prepopulated projects or folders in a new workspace** - This is a bug
- **Any non-admin seeing "Create workspace"** - This is a bug
- **Any case where last workspace_owner can be removed** - This is a bug
- **Any unexpected 4xx/5xx errors on basic flows** - This is a bug

See **TESTER_FOCUS_AREAS.md** for detailed red flag descriptions.

## How to Report

Use the **BUG_REPORT_TEMPLATE.md** for each issue. Include:
- Title
- Role used (admin/member/viewer)
- Steps to reproduce
- Expected vs Actual result
- Screenshots (if helpful)
- Network details (URL, method, status code, response)

## Questions?

If you have questions about expected behavior, refer to the "Expected" sections in TESTER_WORKSPACE_SCRIPT.md. If something doesn't match, report it as a bug.

Thank you!

