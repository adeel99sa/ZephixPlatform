# ClickUp Gap: Permission Edge Cases at Enterprise Scale

## Where Customers Lose Trust

**Answer:** Customers lose trust when permissions don't enforce as documented, leading to data leakage, security risks, and governance failures.

## The Failure Points

### 1. Permission Enforcement Failures

**Problem:**
- Users with view-only permissions can still edit
- Space-level permissions don't fully restrict functionality
- Templates introduce custom fields regardless of user rights
- Permissions "silently changed" or "not working as expected"

**Customer Impact:**
- Data integrity compromised
- Unauthorized changes
- Compliance violations
- Security risks

**Where Trust Breaks:**
- Admins can't rely on permission settings
- Security teams lose confidence
- Compliance audits fail
- Legal exposure

### 2. Data Leakage Through Templates

**Problem:**
- Templates roll out fields into Spaces/Lists even when users shouldn't create/edit those fields
- Private Custom Fields vs templates conflict
- Attachments, Forms, or Clips get public URLs accessible by non-logged-in users

**Customer Impact:**
- Sensitive data exposed
- Compliance violations
- Security breaches
- Legal liability

**Where Trust Breaks:**
- Security teams lose trust completely
- Compliance officers can't certify system
- Executives face legal risk
- Customers abandon platform

### 3. Permission Hierarchy Conflicts

**Problem:**
- Revoking space-permissions doesn't fully restrict functionality
- No space access but still can see views, tasks
- Task-level permissions override in unexpected ways
- Cascading permissions don't work as documented

**Customer Impact:**
- Shadow data access
- Inconsistent visibility
- Governance impossible
- Separation of concerns fails

**Where Trust Breaks:**
- Admins can't maintain structure
- PMO can't enforce boundaries
- Teams lose confidence in system
- Rollout fails

### 4. Rollout Pain Points

**Problem:**
- Phased rollouts expose gaps only with many users
- Templates bypass permissions as admins didn't anticipate
- Migration from legacy data has no permission constraints
- Existing automations break when permissions tighten

**Customer Impact:**
- Rollout delays
- Manual cleanup required
- Training confusion
- Adoption failure

**Where Trust Breaks:**
- PMO can't scale rollout
- Delivery leads lose confidence
- Teams resist adoption
- Enterprise deployment fails

### 5. Audit & Visibility Gaps

**Problem:**
- Hard to audit "who has access to what" across all Spaces/Folders/Lists/Tasks
- Not easily visible in one place
- Private fields break views/dashboards for users without access
- Unexpected missing content confuses users

**Customer Impact:**
- Can't prove compliance
- Can't audit access
- Broken user experiences
- Support burden

**Where Trust Breaks:**
- Compliance officers can't certify
- Security teams can't audit
- Users lose confidence
- Support overwhelmed

## What Zephix Must Do Differently

**Enforce Permissions Correctly:**
- Permissions work as documented (non-negotiable)
- No silent failures
- No data leakage
- Templates respect permissions

**Permission Templates:**
- Templates include permission patterns
- RACI ownership built-in
- Automatic permission setup on instantiation
- No manual configuration

**Clear Boundaries:**
- Document where boundaries break
- Obvious in UI
- Predictable behavior
- No permission escalation

**Audit & Visibility:**
- Full audit trail
- Easy to see "who has access to what"
- Compliance-ready
- Security-certified

---

*Research Date: January 2026*
*Focus: Where customers lose trust in ClickUp's permission system at enterprise scale*
