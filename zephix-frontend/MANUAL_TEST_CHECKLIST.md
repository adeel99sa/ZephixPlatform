# Manual Testing Checklist - Cloudflare API Proxy

## Pre-requisites
- Open https://getzephix.com in Chrome/Firefox
- Open DevTools (F12)
- Go to Network tab
- Filter by "Fetch/XHR"

## Test 1: Login Request
- [ ] Go to https://getzephix.com/login
- [ ] Enter email: adeel99sa@yahoo.com
- [ ] Enter password: ReAdY4wK73967#!@
- [ ] Click Login
- [ ] In Network tab, find `/api/auth/login` request
- [ ] Verify:
  - [ ] Status: 201 or 200 (not 500, not 404)
  - [ ] Response is JSON (not HTML)
  - [ ] Response contains `"success": true`
  - [ ] Response contains `"token": "..."`
  - [ ] Request URL shows: `getzephix.com/api/auth/login` (frontend domain)
  - [ ] No CORS errors in console

## Test 2: Dashboard Data Loading
- [ ] After login, verify redirect to /dashboard
- [ ] In Network tab, check for API calls to:
  - [ ] `/api/kpi/portfolio` or similar
  - [ ] All should return 200/201 (not 500)
  - [ ] All should return JSON (not HTML)
  - [ ] No CORS errors

## Test 3: Milestone-2 Pages Navigation
- [ ] Click on "Resources" in sidebar
- [ ] Verify page loads (even if showing placeholders)
- [ ] Check Network tab for any API calls
- [ ] No console errors

- [ ] Click on "Risks" in sidebar  
- [ ] Verify page loads
- [ ] Check Network tab
- [ ] No console errors

- [ ] Click on "Admin" or "KPI" in sidebar
- [ ] Verify page loads
- [ ] Check Network tab
- [ ] No console errors

## Test 4: Console Check
- [ ] Open Console tab
- [ ] Should see NO errors like:
  - [ ] "Unexpected token '<'" (means getting HTML instead of JSON)
  - [ ] "Failed to fetch" (means CORS or network issue)
  - [ ] "401 Unauthorized" (means token issue)
  - [ ] "CORS policy" errors

## Test 5: localStorage Verification
- [ ] Open Console
- [ ] Type: `localStorage.getItem('authToken')`
- [ ] Should see a JWT token (long string starting with "eyJ...")
- [ ] Type: `localStorage.getItem('user')`
- [ ] Should see user data JSON

## Results
**All tests passed:** No - API proxy not working correctly
**Issues found:** 
- Login endpoint returns HTML instead of JSON
- No redirect to dashboard after login
- API calls not being proxied to backend
**Screenshots:** (attach if issues found)
