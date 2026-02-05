# Documentation Audit Report

**Date:** 2026-02-05  
**Purpose:** Separate execution artifacts from narrative documentation

---

## Summary

This audit reorganized the `/docs` folder to clearly distinguish:
- **Execution-backed docs** - Checklists and verification with reproducible commands
- **Canonical engineering docs** - Architecture, RBAC, operations (governing contracts)
- **Narrative/planning docs** - Strategy, progress summaries, roadmaps (descriptive only)

---

## Actions Taken

### 1. Policy Added

Enhanced `docs/guides/ENGINEERING_PLAYBOOK.md` with:
- Document category definitions (Execution, Canon, Narrative)
- Folder boundary rules
- Execution language rules (no false claims without CI backing)
- Required disclaimer for narrative docs

### 2. Files Moved

| Source | Destination | Count | Reason |
|--------|-------------|-------|--------|
| `docs/*.md` (planning) | `docs/archive/planning/` | 29 | Narrative/roadmap content |
| `docs/*.md` (phases) | `docs/archive/phases/` | 12 | Phase summaries |
| `docs/*.md` (competitive) | `docs/competitive/` | 17 | Market analysis |
| `docs/*.md` (verification) | `docs/verification/` | 9 | Checklists |
| `docs/*.md` (guides) | `docs/guides/` | 18 | Operational docs |
| `docs/*.md` (security) | `docs/security/` | 7 | RBAC/security policies |
| `docs/*.md` (architecture) | `docs/architecture/` | 4 | System design |
| `docs/*.json/*.yaml` | `docs/generated/` | 4 | Config artifacts |

### 3. Files Deleted

| Location | Count | Reason |
|----------|-------|--------|
| `docs/archive/to-delete/` | 177 | Previously validated obsolete docs |

### 4. Duplicate Files Removed

| File | Reason |
|------|--------|
| `docs/OPERATIONS_RUNBOOK.md` | Duplicate of `docs/guides/OPERATIONS_RUNBOOK.md` |
| `docs/ENGINEERING_PLAYBOOK.md` | Duplicate of `docs/guides/ENGINEERING_PLAYBOOK.md` |
| `docs/engineering-playbook.md` | Case variant duplicate |

### 5. Disclaimers Added

Files with `⚠️ DESCRIPTIVE ONLY` disclaimer:
- `docs/competitive/PLATFORM_COMPARISON.md`
- `docs/competitive/README.md`
- `docs/vision/ADMIN_DASHBOARD_BUILDER_PLAN.md`
- `docs/vision/WORKFLOW_ENHANCEMENT_PLAN.md`
- `docs/archive/planning/README.md`

---

## Final Structure

```
docs/
├── README.md                    # Entry point, links to canonical docs
├── ACCEPTABLE_INJECT_REPOSITORY_EXCEPTIONS.md
├── BUG_REPORT_TEMPLATE.md
│
├── architecture/                # System design (CANONICAL)
│   ├── PLATFORM_ARCHITECTURE.md
│   ├── FRONTEND_ROUTE_MAP.md
│   └── PLATFORM_ARCHITECTURE_TREE.md
│
├── guides/                      # Operational docs (CANONICAL)
│   ├── ENGINEERING_PLAYBOOK.md  # ← Has documentation policy
│   ├── OPERATIONS_RUNBOOK.md
│   ├── QUICK_START_FOR_TESTER.md
│   └── ... (18 files)
│
├── security/                    # RBAC/Security (CANONICAL)
│   ├── RBAC.md
│   ├── ADMIN_ACCESS_BEHAVIOR.md
│   └── ... (7 files)
│
├── verification/                # Checklists (EXECUTION-BACKED)
│   ├── VERIFICATION_MASTER.md
│   ├── SMOKE_TEST_CHECKLIST.md
│   └── ... (9 files)
│
├── scope/                       # MVP scope (SOURCE OF TRUTH)
│   └── MVP_SCOPE.md
│
├── implementation/              # Master plan (SOURCE OF TRUTH)
│   └── MASTER_PLAN.md
│
├── competitive/                 # Market analysis (DESCRIPTIVE)
│   ├── PLATFORM_COMPARISON.md   # ← Has disclaimer
│   └── ... (17 files)
│
├── vision/                      # Future plans (DESCRIPTIVE)
│   ├── ADMIN_DASHBOARD_BUILDER_PLAN.md  # ← Has disclaimer
│   └── WORKFLOW_ENHANCEMENT_PLAN.md
│
└── archive/                     # Historical artifacts
    ├── planning/    (29 files)  # Strategy/roadmaps
    ├── phases/      (135 files) # Phase summaries
    ├── debug/       (9 files)   # Debug notes
    ├── verifications/ (26 files)
    ├── smoke-tests/ (6 files)
    └── prompts/     (7 files)
```

---

## What Remains Canonical

| Document | Purpose |
|----------|---------|
| `docs/README.md` | Entry point with quick start |
| `docs/guides/ENGINEERING_PLAYBOOK.md` | Development standards, documentation policy |
| `docs/guides/OPERATIONS_RUNBOOK.md` | Release process, monitoring |
| `docs/architecture/PLATFORM_ARCHITECTURE.md` | System design |
| `docs/security/RBAC.md` | Role-based access rules |
| `docs/verification/VERIFICATION_MASTER.md` | Release verification |
| `docs/scope/MVP_SCOPE.md` | MVP feature scope |
| `docs/implementation/MASTER_PLAN.md` | Vision and roadmap |

---

## Documents That Should Not Live in Repo

The following content types should be moved to private storage:
- Pricing strategy documents
- Go-to-market planning
- Investor-facing materials
- Customer-specific proposals

Currently, no such documents were found in the repo.

---

## Verification

```bash
# Confirm no docs in root except allowed files
ls docs/*.md
# Expected: ACCEPTABLE_INJECT_REPOSITORY_EXCEPTIONS.md, BUG_REPORT_TEMPLATE.md, README.md

# Confirm archive/to-delete is gone
ls docs/archive/to-delete 2>&1
# Expected: No such file or directory

# Confirm canonical docs exist
cat docs/guides/ENGINEERING_PLAYBOOK.md | grep -A5 "Document Categories"
# Expected: Shows policy section
```

---

*Audit completed: 2026-02-05*
