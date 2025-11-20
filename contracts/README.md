# API Contract Fixtures

This directory contains expected API response fixtures for contract verification.

## Usage

### Generate expected fixture
```bash
TOKEN=$TOKEN bash scripts/diff-contracts.sh resources/allocations
# Save the actual output to contracts/resources/allocations.expected.json
```

### Verify current API matches expected
```bash
TOKEN=$TOKEN bash scripts/diff-contracts.sh resources/allocations
```

## Purpose

These fixtures ensure:
- Backend returns snake_case as expected
- Field names match between DB → API → Frontend (via DTO transform)
- No accidental breaking changes to API shape

## Adding new fixtures

1. Call the endpoint locally or in CI with a real auth token
2. Save the response (with null values for dynamic fields) to `contracts/{endpoint}.expected.json`
3. Commit alongside the API endpoint implementation

