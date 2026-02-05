# Documentation Archive

This folder contains historical documentation that is preserved for reference but no longer actively maintained.

## Structure

```
archive/
├── phases/           # Implementation phase summaries (PHASE1-PHASE8)
│   ├── PHASE1/       # Phase 1: Foundation
│   ├── PHASE2/       # Phase 2: Tenancy & Auth
│   ├── PHASE3/       # Phase 3: Workspaces
│   ├── PHASE4/       # Phase 4: Dashboards
│   ├── PHASE5/       # Phase 5: Resources
│   ├── PHASE6/       # Phase 6: Frontend Integration
│   ├── PHASE7/       # Phase 7: Work Management
│   └── PHASE8/       # Phase 8: Templates
├── proofs/           # Verification proofs and test artifacts
├── debug/            # Debug notes and diagnostic reports
├── prompts/          # Cursor prompt artifacts
├── smoke-tests/      # Smoke test results and checklists
├── verifications/    # One-off verification reports
└── to-delete/        # Candidates for deletion (pending review)
```

## Policy

- Files here are **read-only** - do not update archived docs
- For current guidance, see the canonical docs in parent directories
- Delete candidates in `to-delete/` will be removed after CI validation

## Finding Information

If you're looking for something that was moved here:
1. Check the stub file at the original location (if it exists)
2. Search within the appropriate phase folder
3. Use git history to find the original content

---

*Archive created: 2026-02-04*
