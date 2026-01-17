# Monday.com Research: Template Governance

## What They Do

### Managed Templates (Enterprise)

**What They Are:**
- Workspace or board defined as a "managed template"
- When other boards/workspaces are created from it, they become "instances"
- Instances can receive updates when template owner publishes changes
- Marked with crown icon for identification

**Ownership & Permissions:**
- Only template owners can publish changes
- Template members can edit template and view unpublished changes
- Template members cannot initiate publish

### Template Versioning & Updates

**Supported Changes (Propagate to Existing Instances):**
- ✅ Add or delete columns
- ✅ Settings of status, dropdown, formula & number columns
- ✅ Board title/description edits
- ✅ Reordering of columns/groups/items
- ✅ Adding groups
- ✅ Adding items/subitems

**Unsupported Changes (Only Apply to New Instances):**
- ❌ Deleting groups (existing instances keep them)
- ❌ Deleting items/subitems (existing instances keep them)
- ❌ Automations/Integrations/Views/Docs/Dashboards settings (only new instances get them)

**Partial Support:**
- Some column types (dependency, progress, mirror, button, timeline) have limitations
- Their settings may not propagate fully
- Views, docs, dashboards generally apply to new instances but not existing ones

### Deployment & Drift Prevention

**Publish Mechanism:**
- Template owner publishes changes
- Changes push to all instances (for supported change types)
- Release notes automatically posted to template and instances
- Users informed of changes

**Instance Tracking:**
- View all instances from Managed template view
- See instance locations
- "Last publish" status (success or error)
- Identify instances that haven't received updates

**Detach Behavior:**
- Instances can be detached from managed template
- Detached instances stop receiving updates permanently
- Helps prevent unintentional drift (but also allows intentional divergence)

### App Versioning (Separate System)

**For Monday Apps:**
- Apps have versioning workflow: draft → live → deprecated
- Can test changes without disrupting users
- Supports deployment drift prevention on app side
- Different from template versioning

---

## What Breaks at Scale

### Partial Update Support

**Problem:** Many changes don't propagate to existing instances:
- Deleting groups/items doesn't remove from existing instances
- Automations, views, dashboards only apply to new instances
- Complex changes require manual updates

**Impact:**
- Instances drift from template over time
- Manual update work required
- Inconsistent project structures
- Governance becomes difficult

### No Version History

**Problem:** No formal version tracking:
- Can't see what version an instance is on
- No version history of template changes
- Can't roll back to previous version
- No "apply updates" vs "stay on current version" choice

**Impact:**
- Don't know if instance is up to date
- Can't track what changed when
- No audit trail
- Hard to debug issues

### Destructive Changes Don't Propagate

**Problem:** Deleting groups/items doesn't remove from existing instances:
- Template owner deletes obsolete group
- Existing instances keep the group
- Creates inconsistency
- No way to clean up old structure

**Impact:**
- Instances accumulate obsolete structure
- Manual cleanup required
- Inconsistent data
- Hard to maintain

### No Safe Update Path

**Problem:** No "apply updates" flow for non-destructive changes:
- Users don't know updates are available
- No preview of what will change
- No way to selectively apply updates
- All-or-nothing publish

**Impact:**
- Users avoid updates (fear of breaking changes)
- Instances stay on old versions
- Drift increases over time
- Governance fails

### Field/Status Standardization Not Enforced

**Problem:** No enforcement of field and status standardization:
- Users can create custom fields on instances
- Status labels can diverge
- No field catalog or reuse
- Uncontrolled field creation

**Impact:**
- Inconsistent data structures
- Can't roll up metrics
- Hard to compare projects
- Governance impossible

### Template Drift Detection Is Manual

**Problem:** No automatic drift detection:
- Must manually check instance status
- No alerts when instances diverge
- No comparison view (template vs instance)
- Drift only discovered when trying to publish

**Impact:**
- Drift goes unnoticed
- Manual audit required
- Reactive problem-solving
- Governance gaps

---

## What You Should Copy

### 1. Managed Template Concept

**Copy:** Master template that propagates updates to instances.

**Why:** Enables centralized governance. Updates roll out consistently.

**Implementation:**
- Template owner publishes changes
- Instances receive updates (for supported changes)
- Release notes inform users

### 2. Instance Tracking

**Copy:** View all instances, their locations, and sync status.

**Why:** Visibility into template usage. Identify instances needing updates.

**Implementation:**
- Instance list with locations
- Last publish status
- Sync errors highlighted

### 3. Release Notes

**Copy:** Automatic release notes posted to template and instances.

**Why:** Users informed of changes. Transparency builds trust.

**Implementation:**
- Release notes with each publish
- Posted to template and all instances
- Clear communication of changes

### 4. Detach Option

**Copy:** Allow instances to detach from template (stops receiving updates).

**Why:** Some projects need to diverge. Intentional drift is valid.

**Implementation:**
- Detach option available
- Clear warning about consequences
- Detached instances marked

---

## What You Should Avoid

### 1. Don't Make Updates All-or-Nothing

**Avoid:** Forcing all changes to propagate or none.

**Why:** Some changes are safe, others risky. Users need control.

**Instead:** Categorize changes (safe vs risky). Allow selective updates.

### 2. Don't Skip Version Tracking

**Avoid:** No version history or version numbers on instances.

**Why:** Can't tell if instance is up to date. No audit trail.

**Instead:** Track template version. Show version on each instance. Version history.

### 3. Don't Allow Uncontrolled Field Creation

**Avoid:** Letting users create any fields they want on instances.

**Why:** Inconsistent data. Can't roll up. Governance fails.

**Instead:** Field catalog. Promote reuse. Restrict creation for non-admins.

### 4. Don't Hide Update Availability

**Avoid:** Users don't know updates are available.

**Why:** Instances stay on old versions. Drift increases.

**Instead:** Show update availability. Preview changes. Safe "apply updates" path.

### 5. Don't Make Destructive Changes Silent

**Avoid:** Deleting groups/items without clear impact on instances.

**Why:** Users surprised by changes. Breaks existing workflows.

**Instead:** Mark destructive changes. Require explicit approval. Show impact.

### 6. Don't Skip Drift Detection

**Avoid:** No automatic detection of instance drift.

**Why:** Drift goes unnoticed. Governance gaps.

**Instead:** Automatic drift detection. Alerts when instances diverge. Comparison view.

---

## Key Takeaways for Zephix

### What to Build

1. **Template Versioning**
   - Track template version on each instantiated project
   - Version history of template changes
   - Show version on each project
   - Version comparison view

2. **Safe Update Path**
   - Provide "apply updates" path for non-destructive changes
   - Preview of what will change
   - Selective update (choose which changes to apply)
   - Non-destructive changes auto-apply, destructive require approval

3. **Field & Status Standardization**
   - Restrict uncontrolled field creation for non-admins
   - Promote field reuse via catalog
   - Standard statuses per work type
   - Required fields per template

4. **Drift Detection & Prevention**
   - Automatic drift detection
   - Alerts when projects diverge from template
   - Comparison view (template vs project)
   - Drift prevention in UI (warn before custom changes)

5. **Update Governance**
   - Categorize changes (safe vs risky)
   - Safe changes: auto-apply or one-click
   - Risky changes: require approval, show impact
   - Release notes with each update

6. **Template Instantiation**
   - Templates include: work type definitions, required fields, validation rules, views, KPI packs, dashboards, RACI, automation rules
   - Instantiation produces: project, plan, roles, dashboards, KPI wiring, reporting
   - No manual setup required

### What to Avoid

1. **All-or-Nothing Updates**
   - Don't force all changes or none
   - Allow selective updates

2. **No Version Tracking**
   - Don't skip version numbers
   - Track template and instance versions

3. **Uncontrolled Field Creation**
   - Don't let users create any fields
   - Enforce field catalog and reuse

4. **Hidden Updates**
   - Don't hide update availability
   - Show updates, preview, safe apply path

5. **Silent Destructive Changes**
   - Don't delete without warning
   - Mark destructive, require approval

6. **No Drift Detection**
   - Don't skip automatic detection
   - Detect, alert, compare

---

## Implementation Priority

1. **Template versioning:**
   - Track template version on each project
   - Show version in UI
   - Version history

2. **Safe update path:**
   - "Apply updates" for non-destructive changes
   - Preview changes
   - Selective update

3. **Field standardization:**
   - Field catalog
   - Restrict creation for non-admins
   - Promote reuse

4. **Drift detection:**
   - Automatic detection
   - Alerts
   - Comparison view

5. **Update governance:**
   - Categorize changes
   - Safe vs risky handling
   - Release notes

---

*Research Date: January 2026*
*Source: Monday.com documentation, managed templates, template versioning*
