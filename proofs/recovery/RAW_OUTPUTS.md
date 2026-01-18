# RAW COMMAND OUTPUTS INDEX

**Generated:** 2025-01-27  
**Purpose:** Index of all command outputs used for platform tree and status matrix

---

## TABLE OF CONTENTS

All command outputs are saved in `proofs/recovery/commands/` directory.

1. [Repository Context](#repository-context)
2. [Backend Inventory](#backend-inventory)
3. [Frontend Inventory](#frontend-inventory)
4. [Database Inventory](#database-inventory)
5. [API Inventory](#api-inventory)
6. [Build Status](#build-status)
7. [Deployment Files](#deployment-files)

---

## REPOSITORY CONTEXT

### 01_repo_root.txt

**Command:**
```bash
cd /Users/malikadeel/Downloads/ZephixApp && pwd && ls -la
```

**Workdir:** `/Users/malikadeel/Downloads/ZephixApp`

**Purpose:** Capture repository root directory and top-level files

**Output File:** `proofs/recovery/commands/01_repo_root.txt`

---

### 02_top_level_tree.txt

**Command:**
```bash
cd /Users/malikadeel/Downloads/ZephixApp && ls -la
```

**Workdir:** `/Users/malikadeel/Downloads/ZephixApp`

**Purpose:** Capture top-level directory structure

**Output File:** `proofs/recovery/commands/02_top_level_tree.txt`

---

## BACKEND INVENTORY

### 10_backend_counts.txt

**Command:**
```bash
cd zephix-backend && {
  find src -type f | wc -l
  find src -type f -name "*.ts" | wc -l
  find src/modules -maxdepth 2 -type d | wc -l
  find src/modules -maxdepth 1 -type d | sed 's|^./||' | sort
  find src/modules -type f -name "*.controller.ts" | wc -l
  find src/modules -type f -name "*.service.ts" | wc -l
  find src/modules -type f -name "*.entity.ts" | wc -l
  find src -type f -name "*.spec.ts" | wc -l
}
```

**Workdir:** `zephix-backend`

**Purpose:** Count backend files, modules, controllers, services, entities, and tests

**Output File:** `proofs/recovery/commands/10_backend_counts.txt`

**Contains:**
- Total files in src/: 868
- TypeScript files: 812
- Module directories: 134
- Module list: 37 modules
- Controllers: 48
- Services: 94
- Entities: 62
- Test files: 52

---

## FRONTEND INVENTORY

### 20_frontend_counts.txt

**Command:**
```bash
cd zephix-frontend && {
  find src -type f | wc -l
  find src -type f -name "*.ts" | wc -l
  find src -type f -name "*.tsx" | wc -l
  find src/pages -type f -name "*.tsx" | wc -l
  find src/components -type f | wc -l
  find src/features -type f | wc -l
  find src -type f \( -name "*.test.ts" -o -name "*.test.tsx" \) | wc -l
}
```

**Workdir:** `zephix-frontend`

**Purpose:** Count frontend files, pages, components, features, and tests

**Output File:** `proofs/recovery/commands/20_frontend_counts.txt`

**Contains:**
- Total files in src/: 667
- TypeScript files: 168
- TSX files: 467
- Pages: 137
- Components: 213
- Features: 132
- Test files: 42

---

## DATABASE INVENTORY

### 30_db_counts.txt

**Command:**
```bash
cd zephix-backend && {
  find src/migrations -type f | wc -l
  find src -type f -name "*.entity.ts" | wc -l
  ls -la src/migrations | head -n 50
}
```

**Workdir:** `zephix-backend`

**Purpose:** Count migrations and entities, list migration files

**Output File:** `proofs/recovery/commands/30_db_counts.txt`

**Contains:**
- Migration files: 86
- Entity files: 98
- Migration file listing (first 50)

---

## API INVENTORY

### 40_controllers_list.txt

**Command:**
```bash
cd zephix-backend && find src/modules -type f -name "*.controller.ts" | sort
```

**Workdir:** `zephix-backend`

**Purpose:** List all controller files

**Output File:** `proofs/recovery/commands/40_controllers_list.txt`

**Contains:**
- Complete list of 48 controller files

---

### 41_route_decorators_sample.txt

**Command:**
```bash
cd zephix-backend && grep -RIn --include="*.controller.ts" "@Controller\|@Get\|@Post\|@Patch\|@Delete" src/modules | head -n 200
```

**Workdir:** `zephix-backend`

**Purpose:** Sample of route decorators in controllers

**Output File:** `proofs/recovery/commands/41_route_decorators_sample.txt`

**Contains:**
- Sample of route decorators (first 200 matches)

---

### 42_route_counts.txt

**Command:**
```bash
bash proofs/recovery/scripts/count_routes.sh
```

**Script:** `proofs/recovery/scripts/count_routes.sh`

**Workdir:** Repository root

**Purpose:** Count route decorators by type

**Output File:** `proofs/recovery/commands/42_route_counts.txt`

**Contains:**
- controller_files=48
- get_count=118
- post_count=78
- patch_count=37
- delete_count=18

---

## BUILD STATUS

### 50_backend_build.txt

**Command:**
```bash
cd zephix-backend && npm run build
```

**Workdir:** `zephix-backend`

**Purpose:** Capture backend build output

**Output File:** `proofs/recovery/commands/50_backend_build.txt`

**Contains:**
- Build command output (first 100 lines)
- Build status: ✅ PASSES

---

### 60_frontend_build.txt

**Command:**
```bash
cd zephix-frontend && npm run build
```

**Workdir:** `zephix-frontend`

**Purpose:** Capture frontend build output

**Output File:** `proofs/recovery/commands/60_frontend_build.txt`

**Contains:**
- Build command output (first 100 lines)
- Build status: ✅ PASSES
- 2076 modules transformed
- Build warnings (chunk size)

---

## DEPLOYMENT FILES

### 80_deployment_files.txt

**Command:**
```bash
ls -la railway.toml .github/workflows/ .nixpacks/
```

**Workdir:** Repository root

**Purpose:** Verify deployment configuration files exist

**Output File:** `proofs/recovery/commands/80_deployment_files.txt`

**Contains:**
- railway.toml exists
- .github/workflows/ contains 3 files (ci.yml, enterprise-ci.yml, release.yml)
- .nixpacks/config.toml exists

---

## MISSING PROOFS

The following proofs were not captured but would be needed to upgrade status from "Partial" to "Working":

1. **51_backend_tests.txt** - Backend test run output
   - Command: `cd zephix-backend && npm test`

2. **61_frontend_tests.txt** - Frontend test run output
   - Command: `cd zephix-frontend && npm test`

3. **70_backend_boot.txt** - Backend runtime boot logs (first 120 lines)
   - Command: Start backend server and capture boot logs

4. **71_frontend_boot.txt** - Frontend dev server boot logs (first 60 lines)
   - Command: Start frontend dev server and capture boot logs

5. **Security audit outputs** - Security vulnerability reports
   - Command: `cd zephix-backend && npm audit --production`
   - Command: `cd zephix-frontend && npm audit --production`

6. **Runtime API proofs** - API call proofs for auth, workspaces, projects, templates, docs, forms, admin flows
   - Command: Manual API calls or browser automation tests

---

## COMMAND SUMMARY

| File | Command Type | Workdir | Purpose |
|------|-------------|---------|---------|
| `01_repo_root.txt` | `pwd && ls -la` | Root | Repository context |
| `02_top_level_tree.txt` | `ls -la` | Root | Top-level structure |
| `10_backend_counts.txt` | `find` + `wc -l` | Backend | Backend file counts |
| `20_frontend_counts.txt` | `find` + `wc -l` | Frontend | Frontend file counts |
| `30_db_counts.txt` | `find` + `ls` | Backend | Database counts |
| `40_controllers_list.txt` | `find` | Backend | Controller list |
| `41_route_decorators_sample.txt` | `grep` | Backend | Route decorators sample |
| `42_route_counts.txt` | Script | Root | Route counts |
| `50_backend_build.txt` | `npm run build` | Backend | Backend build |
| `60_frontend_build.txt` | `npm run build` | Frontend | Frontend build |
| `80_deployment_files.txt` | `ls -la` | Root | Deployment files |

---

**END OF RAW OUTPUTS INDEX**
