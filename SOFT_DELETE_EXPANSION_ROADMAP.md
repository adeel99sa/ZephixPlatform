# Soft Delete Expansion Roadmap

## Current Status ✅

### Completed (Phase 1)
- ✅ **Projects** - Full soft delete with undo banner and admin restore
- ✅ **Tasks** - Full soft delete with undo banner and admin restore
- ✅ **Backend APIs** - All necessary endpoints implemented
- ✅ **Frontend Components** - Undo banner and trash page working
- ✅ **Documentation** - API docs, user guide, and changelog created

## Remaining Services (Priority Order)

### Phase 2: High Priority (Week 2-3)

#### 1. Workspaces (High Priority)
- **Why:** Contains projects, so deletion affects project hierarchy
- **Estimated Time:** 45 minutes
- **Files to Modify:**
  - `zephix-backend/src/modules/workspaces/workspaces.controller.ts`
  - `zephix-backend/src/modules/workspaces/services/workspaces.service.ts`
  - `zephix-frontend/src/pages/workspaces/WorkspacesPage.tsx`
- **Special Considerations:**
  - Need to handle project reassignment when workspace is deleted
  - Update project queries to exclude projects from deleted workspaces

#### 2. Teams (High Priority)
- **Why:** User management, affects project assignments
- **Estimated Time:** 30 minutes
- **Files to Modify:**
  - `zephix-backend/src/modules/teams/teams.controller.ts`
  - `zephix-backend/src/modules/teams/services/teams.service.ts`
  - `zephix-frontend/src/pages/teams/TeamsPage.tsx`
- **Special Considerations:**
  - Handle team member reassignment
  - Update project assignment queries

### Phase 3: Medium Priority (Week 4-5)

#### 3. Resources (Medium Priority)
- **Why:** Resource allocation data, affects project planning
- **Estimated Time:** 30 minutes
- **Files to Modify:**
  - `zephix-backend/src/modules/resources/resources.controller.ts`
  - `zephix-backend/src/modules/resources/services/resources.service.ts`
  - `zephix-frontend/src/pages/resources/ResourcesPage.tsx`

#### 4. Risks (Medium Priority)
- **Why:** Project risk data, important for project management
- **Estimated Time:** 30 minutes
- **Files to Modify:**
  - `zephix-backend/src/modules/risks/risks.controller.ts`
  - `zephix-backend/src/modules/risks/services/risks.service.ts`
  - `zephix-frontend/src/pages/risks/RisksPage.tsx`

#### 5. Documents (Medium Priority)
- **Why:** File attachments, important for project documentation
- **Estimated Time:** 45 minutes
- **Files to Modify:**
  - `zephix-backend/src/modules/documents/documents.controller.ts`
  - `zephix-backend/src/modules/documents/services/documents.service.ts`
  - `zephix-frontend/src/pages/documents/DocumentsPage.tsx`
- **Special Considerations:**
  - Handle file cleanup for permanently deleted documents
  - Update file storage references

### Phase 4: Lower Priority (Week 6-8)

#### 6. Dependencies (Lower Priority)
- **Why:** Task dependencies, affects project scheduling
- **Estimated Time:** 30 minutes

#### 7. Project Phases (Lower Priority)
- **Why:** Project structure, affects project organization
- **Estimated Time:** 30 minutes

#### 8. Project Assignments (Lower Priority)
- **Why:** User assignments, affects project access
- **Estimated Time:** 30 minutes

#### 9. Resource Allocations (Lower Priority)
- **Why:** Resource scheduling, affects project planning
- **Estimated Time:** 30 minutes

#### 10. Risk Mitigations (Lower Priority)
- **Why:** Risk management, affects project risk handling
- **Estimated Time:** 30 minutes

### Phase 5: Advanced Features (Week 9-12)

#### 11. Users (Special Case)
- **Why:** User accounts, requires special handling
- **Estimated Time:** 60 minutes
- **Special Considerations:**
  - Cannot soft delete active users
  - Need to handle user data anonymization
  - Update all references to deleted users

#### 12. Organizations (Special Case)
- **Why:** Top-level entities, affects all data
- **Estimated Time:** 90 minutes
- **Special Considerations:**
  - Cascade soft delete to all child entities
  - Handle organization data isolation
  - Update all queries to exclude deleted organizations

## Implementation Strategy

### For Each Service (30-45 minutes)

#### Step 1: Backend Controller (10 minutes)
```typescript
// Add bulk restore endpoint
@Post('bulk-restore')
async bulkRestore(
  @Body() dto: { ids: string[] },
  @GetTenant() tenant: TenantContext,
) {
  // Implementation similar to projects
}
```

#### Step 2: Backend Service (15 minutes)
```typescript
// Add restore method
async restoreEntity(id: string, organizationId: string, userId: string): Promise<Entity> {
  // Implementation similar to projects
}
```

#### Step 3: Frontend Integration (15 minutes)
```typescript
// Add undo banner to page component
const { isVisible, message, showUndoBanner, handleUndo, handleDismiss } = useUndoBanner();

// Add undo banner to JSX
<UndoBanner
  visible={isVisible}
  message={message}
  onUndo={handleUndo}
  onDismiss={handleDismiss}
  duration={10000}
/>
```

#### Step 4: Testing (5 minutes)
- Test soft delete
- Test undo banner
- Test admin restore
- Test bulk operations

### Batch Implementation Approach

#### Week 2: Workspaces + Teams
- Day 1: Implement workspaces soft delete
- Day 2: Implement teams soft delete
- Day 3: Test and fix issues

#### Week 3: Resources + Risks
- Day 1: Implement resources soft delete
- Day 2: Implement risks soft delete
- Day 3: Test and fix issues

#### Week 4: Documents + Dependencies
- Day 1: Implement documents soft delete
- Day 2: Implement dependencies soft delete
- Day 3: Test and fix issues

## Quality Assurance

### Testing Checklist (Per Service)
- [ ] Soft delete works correctly
- [ ] Undo banner appears and functions
- [ ] Admin can restore from trash
- [ ] Bulk restore works
- [ ] Permanent delete works
- [ ] Error handling works
- [ ] Security permissions work
- [ ] Performance is acceptable

### Code Review Checklist
- [ ] Follows existing patterns
- [ ] Proper error handling
- [ ] Security considerations
- [ ] Performance optimization
- [ ] Documentation updated

## Success Metrics

### Phase 2 Goals (Week 2-3)
- 4 additional services with soft delete
- 100% of high-priority entities protected
- All admin operations working

### Phase 3 Goals (Week 4-5)
- 8 additional services with soft delete
- 100% of medium-priority entities protected
- Performance remains stable

### Phase 4 Goals (Week 6-8)
- 12 additional services with soft delete
- 100% of lower-priority entities protected
- Advanced features implemented

### Phase 5 Goals (Week 9-12)
- All entities with soft delete
- Special cases handled properly
- Complete system protection

## Risk Mitigation

### Technical Risks
- **Performance Impact:** Monitor query performance, add indexes as needed
- **Data Integrity:** Ensure proper foreign key handling
- **Memory Usage:** Monitor trash page performance with large datasets

### Business Risks
- **User Confusion:** Provide clear documentation and training
- **Data Loss:** Implement proper backup procedures
- **Admin Overhead:** Automate cleanup processes where possible

## Future Enhancements

### Advanced Features
- **Automatic Cleanup:** Configurable automatic permanent deletion
- **Advanced Filtering:** Filter trash by date, user, type, etc.
- **Bulk Operations:** Select and operate on multiple items
- **Email Notifications:** Notify admins of deletions
- **Audit Trail:** Detailed logging of all operations
- **Data Export:** Export trash data for analysis

### Performance Optimizations
- **Database Indexing:** Optimize queries for large datasets
- **Caching:** Cache frequently accessed trash data
- **Pagination:** Implement cursor-based pagination for very large datasets
- **Background Processing:** Move heavy operations to background jobs

---

## Summary

This roadmap provides a clear path to implement soft delete for all 39 remaining services in the Zephix platform. The phased approach ensures that high-priority entities are protected first while maintaining system stability and performance.

**Total Estimated Time:** 20-25 hours over 12 weeks
**Risk Level:** Low (following proven patterns)
**Business Value:** High (prevents data loss, improves user experience)





