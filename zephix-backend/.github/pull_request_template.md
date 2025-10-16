# Zephix Backend – Stabilization Checklist

- [ ] I ran the greenline locally against the target environment:
  - [ ] `/_meta` returns a `jwt.secretHash` (paste 12-char hash): `______`
  - [ ] `/health` returns `status=healthy`
  - [ ] `/auth-debug` returns 200 with my user when using a fresh login token
  - [ ] `/projects/{knownProject}/phases` returns 200 (or 404 if not found, but not 401)
- [ ] If DB shape changed, migration exists and ran successfully.
- [ ] CI `build` succeeded. (Optional: e2e-smoke run green.)

## Notes
Paste minimal outputs (omit secrets).
