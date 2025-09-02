# Database-Entity Mismatches to Fix

## CRITICAL MISMATCHES:

### 1. ResourceAllocation Entity
- Database column: 'resourceId' (camelCase) vs Entity property: resourceId
- Database column: 'projectId' (camelCase) vs Entity property: projectId
- Database column: 'startDate' (camelCase) vs Entity property: startDate
- Database column: 'endDate' (camelCase) vs Entity property: endDate
- Database column: 'allocationPercentage' (camelCase) vs Entity property: allocationPercentage
- Database column: 'hoursPerDay' (camelCase) vs Entity property: hoursPerDay
- Database column: 'workItemId' (camelCase) vs Entity property: workItemId
- Database column: 'taskId' (camelCase) vs Entity property: taskId

### 2. Database Schema Issues
- Mixed naming conventions (snake_case and camelCase)
- Need to standardize ALL database columns to snake_case

## ACTION PLAN:
1. Rename all camelCase database columns to snake_case
2. Update all entity @Column decorators to use snake_case names
3. Ensure entity properties remain camelCase (TypeScript convention)
4. Test all entities with database queries
