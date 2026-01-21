# ZEPHIX PLATFORM ARCHITECTURE TREE

**Generated:** 2026-01-18  
**Source of Truth:** proofs/recovery/commands/  
**Purpose:** Codebase-driven architecture documentation

---

## PROOF ARTIFACTS

All numeric claims in this document are extracted from command outputs in `proofs/recovery/commands/`. See `RAW_OUTPUTS.md` for complete command reference.

---

## 1. MONOREPO STRUCTURE

**Proof:** `proofs/recovery/commands/01_repo_root.txt`, `proofs/recovery/commands/02_top_level_tree.txt`

```
ZephixApp/
├── zephix-backend/          # NestJS API backend
├── zephix-frontend/         # React SPA frontend
├── zephix-landing/          # Marketing landing site
├── packages/                # Shared packages
├── docs/                    # Documentation
├── scripts/                 # Deployment & utility scripts
├── proofs/                  # Verification evidence
├── railway.toml             # Railway deployment config
├── .github/workflows/       # CI/CD workflows
└── .nixpacks/               # Nixpacks builder config
```

---

## 2. BACKEND ARCHITECTURE

### 2.1 File Counts

**Proof:** `proofs/recovery/commands/10_backend_counts.txt`

- **Total files in src/:** 868 files
- **TypeScript files (.ts):** 812 files
- **Modules:** 35 modules
- **Controllers:** 48 files (`*.controller.ts`)
- **Services:** 94 files (`*.service.ts`)
- **Entities:** 98 files (`*.entity.ts`)
- **Test files (.spec.ts):** 52 files

### 2.2 Database Architecture

**Proof:** `proofs/recovery/commands/30_db_counts.txt`

- **Migration files:** 86 migrations
- **Entity files:** 98 entities

---

## 3. FRONTEND ARCHITECTURE

### 3.1 File Counts

**Proof:** `proofs/recovery/commands/20_frontend_counts.txt`

- **Total files in src/:** 667 files
- **TypeScript files (.ts):** 168 files
- **React components (.tsx):** 467 files
- **Page components:** 137 pages (`src/pages/*.tsx`)
- **Components:** 213 files (`src/components/`)
- **Feature modules:** 132 files (`src/features/`)
- **Test files:** 42 files (`*.test.ts`, `*.test.tsx`)

---

## 4. API ARCHITECTURE

### 4.1 Route Counts

**Proof:** `proofs/recovery/commands/42_route_counts.txt`

- **Controller files:** 48 controllers
- **GET endpoints:** 118
- **POST endpoints:** 78
- **PATCH endpoints:** 37
- **DELETE endpoints:** 18
- **Total endpoints:** 251

---

## 5. BUILD STATUS

### 5.1 Backend Build

**Proof:** `proofs/recovery/commands/40_backend_build.txt`

**Status:** See proof file for build output.

### 5.2 Frontend Build

**Proof:** `proofs/recovery/commands/41_frontend_build.txt`

**Status:** See proof file for build output.

---

## 6. KEY METRICS SUMMARY

| Metric | Count | Proof File |
|--------|-------|------------|
| **Backend Files** | 868 | `10_backend_counts.txt` |
| **Backend TypeScript** | 812 | `10_backend_counts.txt` |
| **Backend Modules** | 35 | `10_backend_counts.txt` |
| **Controllers** | 48 | `10_backend_counts.txt` |
| **Services** | 94 | `10_backend_counts.txt` |
| **Entities** | 98 | `10_backend_counts.txt` |
| **Test Files (Backend)** | 52 | `10_backend_counts.txt` |
| **GET Endpoints** | 118 | `42_route_counts.txt` |
| **POST Endpoints** | 78 | `42_route_counts.txt` |
| **PATCH Endpoints** | 37 | `42_route_counts.txt` |
| **DELETE Endpoints** | 18 | `42_route_counts.txt` |
| **Total Endpoints** | 251 | `42_route_counts.txt` |
| **Migrations** | 86 | `30_db_counts.txt` |
| **Entities (DB)** | 98 | `30_db_counts.txt` |
| **Frontend Files** | 667 | `20_frontend_counts.txt` |
| **Frontend TypeScript** | 168 | `20_frontend_counts.txt` |
| **Frontend TSX** | 467 | `20_frontend_counts.txt` |
| **Pages** | 137 | `20_frontend_counts.txt` |
| **Components** | 213 | `20_frontend_counts.txt` |
| **Features** | 132 | `20_frontend_counts.txt` |
| **Test Files (Frontend)** | 42 | `20_frontend_counts.txt` |

---

**END OF ARCHITECTURE TREE**

**Note:** This document contains only facts extracted from proof artifacts. No estimates, percentages, or assessments are included.