## Proof: Lint Ratchet Working

### Commit 1: ESLint Rule Fix
```
ae0f0a3a fix(eslint): allow TypeOrmModule from @nestjs/typeorm
```

### Commit 2: CI Wiring
```
ea2a9ff4 ci: add lint ratchet with changed-files-only gate
```

### Commit 3: Documentation
```
99e062a2 docs: lint ratchet setup complete
```

### Test: Lint-Changed Failure Case
When a file with a restricted import is added:
```
$ echo "import { Repository } from 'typeorm';" > test.ts
$ npm run lint:changed
❌ Error: 'typeorm' import is restricted
```

### CI Integration
- ✅ `lint:changed` runs as required step in `contract-gate` job
- ✅ Full lint runs as informational (non-blocking) in `enterprise-ci`
- ✅ Developers run `npm run lint:changed` before pushing

### Known Issues (Follow-up)
- `templates-instantiate-v51.service.ts` uses `@InjectRepository` and direct `typeorm` imports
  - This file is part of template work and should be migrated to TenantAwareRepository
  - Not blocking merge (existing code)
  - Tracked for incremental cleanup

