# Current Entity Mapping Analysis

## User Entity (src/modules/users/entities/user.entity.ts)
✅ GOOD: Most columns properly mapped with snake_case names
- @Column({ name: 'first_name' }) -> firstName
- @Column({ name: 'organization_id' }) -> organizationId
- @Column({ name: 'profile_picture' }) -> profilePicture

## ResourceAllocation Entity (src/modules/resources/entities/resource-allocation.entity.ts)
❌ INCONSISTENT: Mixed naming conventions
- @Column({ name: 'resourceId' }) -> resourceId (camelCase in DB)
- @Column({ name: 'projectId' }) -> projectId (camelCase in DB)
- @Column({ name: 'organization_id' }) -> organizationId (snake_case in DB)
- @Column({ name: 'user_id' }) -> userId (snake_case in DB)

## Issues Found:
1. ResourceAllocation has inconsistent column naming
2. Some entities use camelCase for database columns
3. Need to standardize ALL database columns to snake_case
