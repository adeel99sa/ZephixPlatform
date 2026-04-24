# env-validator - Transitional TODO

## Transitional: NODE_ENV="staging" warning

Currently `validateEnvironment()` accepts `NODE_ENV=staging` with a warning
instead of an error. This is a migration window to allow Railway staging to
boot while we switch `NODE_ENV` from `staging` to `production`.

### Removal criteria

Remove the transitional branch in `validateEnvironment()` when ALL of:

- [ ] Railway staging backend shows `Environment validated: NODE_ENV=production, ZEPHIX_ENV=staging` in logs for at least 7 days
- [ ] Railway staging logs no longer contain `TransitionalNodeEnvWarning`
- [ ] Any other environments (demo, sandbox, CI) have been audited and set to valid NODE_ENV values
- [ ] Team has been notified that `NODE_ENV=staging` will become fatal

### Code location

`zephix-backend/src/bootstrap/env-validator.ts` - search for `TransitionalNodeEnvWarning`

### When removing

1. Delete the `if (nodeEnv === 'staging')` branch
2. Keep the `errors.push(...)` else branch as the sole path
3. Update `env-validator.spec.ts`: change the warning test back to expecting an error
4. Delete this file (`env-validator.todo.md`)
