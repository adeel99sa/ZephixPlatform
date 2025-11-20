## Description
<!-- What does this PR do? -->

## Evidence Checklist

Before submitting, verify:

- [ ] **Build logs pasted** (frontend/backend)
  ```bash
  cd zephix-frontend && npm ci && npm run build  # paste output
  ```

- [ ] **Lint passed** (`npm run lint:new`)
  ```bash
  npm run lint:new  # paste output
  ```

- [ ] **Unit tests ran** (`npm run test:coverage`)
  ```bash
  npm run test:coverage  # paste output
  ```

- [ ] **Contract diff** (if touching API endpoints)
  ```bash
  TOKEN=$TOKEN bash scripts/diff-contracts.sh  # paste diff or "✅ no changes"
  ```

- [ ] **No direct axios imports** (CI will check this automatically)

- [ ] **Failure Report used** (if fixing a bug - use template from `rules/enterprise-core.mdc`)

## Testing

- [ ] Tested locally
- [ ] E2E tests pass (if applicable)
- [ ] Manual QA steps documented (if UI changes)

## Related Issues

Fixes #

## Screenshots / Videos
<!-- If UI changes -->

