# Quick Start Guide for Tester

## 🚀 Getting Started

### Step 1: Get Test Accounts

You will receive three test account credentials:
- **Admin**: `tester-admin@zephix.ai` / `Test123!@#`
- **Member**: `tester-member@zephix.ai` / `Test123!@#`
- **Viewer**: `tester-viewer@zephix.ai` / `Test123!@#`

### Step 2: Access the Application

1. Open the application URL (provided separately)
2. Log in with `tester-admin@zephix.ai` / `Test123!@#`
3. You should see zero workspaces initially

### Step 3: Follow the Testing Script

Open **`TESTER_WORKSPACE_SCRIPT.md`** and follow it step by step.

## 🎯 What to Test

### Core Focus Areas

1. **Workspace Creation**
   - Who can see "Create workspace" button?
   - What happens when a workspace is created?
   - Is the new workspace completely empty?

2. **Ownership & Membership**
   - Who can manage members?
   - Can you remove the last owner?
   - Do role changes work correctly?

3. **Empty State**
   - Does new workspace show empty state?
   - Are there any precreated projects or folders? (This is a bug!)

## ⚠️ Critical Bugs

Report these immediately:

- ❌ **Any content in a new workspace** (projects, folders, etc.) that you didn't create
- ❌ **Non-admin seeing "Create workspace"** button
- ❌ **Last owner can be removed** or demoted
- ❌ **Any 4xx/5xx errors** on basic operations

## 📝 How to Report

Use **`BUG_REPORT_TEMPLATE.md`** for each issue.

Include:
- What you expected
- What actually happened
- Steps to reproduce
- Screenshots
- Browser console errors (F12 → Console)

## 📚 Documents Reference

- **TESTER_WORKSPACE_SCRIPT.md** - Your main testing guide
- **VERIFICATION_CHECKLIST.md** - Quick checklist
- **BUG_REPORT_TEMPLATE.md** - Bug reporting format

## ❓ Questions?

If you're unsure about expected behavior, check the "Expected" sections in the tester script. If something doesn't match, report it as a bug.








