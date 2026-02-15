# Earned Value PATCH Validation Fix

**Date:** 2026-02-15
**Blocker:** PATCH /api/projects/:id with `{ costTrackingEnabled: true }` returned VALIDATION_ERROR

## Root Cause

`costTrackingEnabled` and `earnedValueEnabled` exist on the Project entity
but were NOT declared in `CreateProjectDto`. Since `UpdateProjectDto` extends
`PartialType(CreateProjectDto)`, class-validator rejected them.

## Fix Applied

Added 6 governance boolean flags to `CreateProjectDto`:
- `costTrackingEnabled`, `earnedValueEnabled`, `waterfallEnabled`
- `baselinesEnabled`, `capacityEnabled`, `iterationsEnabled`

All are `@IsOptional() @IsBoolean()`. Added DTO validation test (6 tests).

## Earned Value Flow

1. PATCH `/api/projects/:id` with `{ costTrackingEnabled: true, earnedValueEnabled: true }`
2. POST `/api/work/projects/:id/baselines` to create baseline
3. GET `/api/work/projects/:id/earned-value?asOfDate=YYYY-MM-DD` to compute
4. POST `/api/work/projects/:id/earned-value/snapshot` to persist
