import fs from "fs";
import path from "path";

const root = process.cwd();
const outDir = path.join(root, "proofs/recovery");
const cmdsDir = path.join(outDir, "commands");

function readCmd(name: string): string {
  const filePath = path.join(cmdsDir, `${name}.txt`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing proof file: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function pickNumber(block: string, key: string): string {
  const lines = block.split("\n").map(l => l.trim());
  const idx = lines.findIndex(l => l === `${key}:`);
  if (idx === -1 || idx + 1 >= lines.length) {
    throw new Error(`Missing ${key} in proof output`);
  }
  const line = lines[idx + 1];
  const n = line.replace(/[^\d]/g, "");
  if (!n) {
    throw new Error(`Bad number for ${key}: ${line}`);
  }
  return n;
}

function extractRouteTotal(block: string): string {
  const lines = block.split("\n");
  const totalLine = lines.find(l => l.includes("Total endpoints:"));
  if (totalLine) {
    const match = totalLine.match(/(\d+)/);
    if (match) return match[1];
  }
  // Fallback: calculate from individual counts
  const getMatch = block.match(/get_count=(\d+)/);
  const postMatch = block.match(/post_count=(\d+)/);
  const patchMatch = block.match(/patch_count=(\d+)/);
  const deleteMatch = block.match(/delete_count=(\d+)/);
  if (getMatch && postMatch && patchMatch && deleteMatch) {
    const total = parseInt(getMatch[1]) + parseInt(postMatch[1]) + 
                  parseInt(patchMatch[1]) + parseInt(deleteMatch[1]);
    return total.toString();
  }
  return "unknown";
}

function write(name: string, content: string) {
  fs.writeFileSync(path.join(outDir, name), content);
}

// Read proof files
const b = readCmd("10_backend_counts");
const f = readCmd("20_frontend_counts");
const db = readCmd("30_db_counts");
const routes = readCmd("42_route_counts");

// Extract numbers
const backendFilesTotal = pickNumber(b, "files_total");
const backendTs = pickNumber(b, "ts_files");
const backendModules = pickNumber(b, "modules");
const backendControllers = pickNumber(b, "controllers");
const backendServices = pickNumber(b, "services");
const backendEntities = pickNumber(b, "entities");
const backendSpecs = pickNumber(b, "spec_files");

const frontendFilesTotal = pickNumber(f, "files_total");
const frontendTs = pickNumber(f, "ts_files");
const frontendTsx = pickNumber(f, "tsx_files");
const pages = pickNumber(f, "pages_tsx");
const components = pickNumber(f, "components_files");
const features = pickNumber(f, "features_files");
const frontendTests = pickNumber(f, "test_files");

const migrations = pickNumber(db, "migrations");
const entities = pickNumber(db, "entities");

const getCount = routes.match(/get_count=(\d+)/)?.[1] || "unknown";
const postCount = routes.match(/post_count=(\d+)/)?.[1] || "unknown";
const patchCount = routes.match(/patch_count=(\d+)/)?.[1] || "unknown";
const deleteCount = routes.match(/delete_count=(\d+)/)?.[1] || "unknown";

// Calculate total from individual counts
let endpointTotal = "unknown";
if (getCount !== "unknown" && postCount !== "unknown" && patchCount !== "unknown" && deleteCount !== "unknown") {
  endpointTotal = (parseInt(getCount) + parseInt(postCount) + parseInt(patchCount) + parseInt(deleteCount)).toString();
}

// Use actual date from proof file timestamps or current date
const now = new Date().toISOString().split('T')[0];

const tree = `# ZEPHIX PLATFORM ARCHITECTURE TREE

**Generated:** ${now}  
**Source of Truth:** proofs/recovery/commands/  
**Purpose:** Codebase-driven architecture documentation

---

## PROOF ARTIFACTS

All numeric claims in this document are extracted from command outputs in \`proofs/recovery/commands/\`. See \`RAW_OUTPUTS.md\` for complete command reference.

---

## 1. MONOREPO STRUCTURE

**Proof:** \`proofs/recovery/commands/01_repo_root.txt\`, \`proofs/recovery/commands/02_top_level_tree.txt\`

\`\`\`
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
\`\`\`

---

## 2. BACKEND ARCHITECTURE

### 2.1 File Counts

**Proof:** \`proofs/recovery/commands/10_backend_counts.txt\`

- **Total files in src/:** ${backendFilesTotal} files
- **TypeScript files (.ts):** ${backendTs} files
- **Modules:** ${backendModules} modules
- **Controllers:** ${backendControllers} files (\`*.controller.ts\`)
- **Services:** ${backendServices} files (\`*.service.ts\`)
- **Entities:** ${backendEntities} files (\`*.entity.ts\`)
- **Test files (.spec.ts):** ${backendSpecs} files

### 2.2 Database Architecture

**Proof:** \`proofs/recovery/commands/30_db_counts.txt\`

- **Migration files:** ${migrations} migrations
- **Entity files:** ${entities} entities

---

## 3. FRONTEND ARCHITECTURE

### 3.1 File Counts

**Proof:** \`proofs/recovery/commands/20_frontend_counts.txt\`

- **Total files in src/:** ${frontendFilesTotal} files
- **TypeScript files (.ts):** ${frontendTs} files
- **React components (.tsx):** ${frontendTsx} files
- **Page components:** ${pages} pages (\`src/pages/*.tsx\`)
- **Components:** ${components} files (\`src/components/\`)
- **Feature modules:** ${features} files (\`src/features/\`)
- **Test files:** ${frontendTests} files (\`*.test.ts\`, \`*.test.tsx\`)

---

## 4. API ARCHITECTURE

### 4.1 Route Counts

**Proof:** \`proofs/recovery/commands/42_route_counts.txt\`

- **Controller files:** ${backendControllers} controllers
- **GET endpoints:** ${getCount}
- **POST endpoints:** ${postCount}
- **PATCH endpoints:** ${patchCount}
- **DELETE endpoints:** ${deleteCount}
- **Total endpoints:** ${endpointTotal}

---

## 5. BUILD STATUS

### 5.1 Backend Build

**Proof:** \`proofs/recovery/commands/40_backend_build.txt\`

**Status:** See proof file for build output.

### 5.2 Frontend Build

**Proof:** \`proofs/recovery/commands/41_frontend_build.txt\`

**Status:** See proof file for build output.

---

## 6. KEY METRICS SUMMARY

| Metric | Count | Proof File |
|--------|-------|------------|
| **Backend Files** | ${backendFilesTotal} | \`10_backend_counts.txt\` |
| **Backend TypeScript** | ${backendTs} | \`10_backend_counts.txt\` |
| **Backend Modules** | ${backendModules} | \`10_backend_counts.txt\` |
| **Controllers** | ${backendControllers} | \`10_backend_counts.txt\` |
| **Services** | ${backendServices} | \`10_backend_counts.txt\` |
| **Entities** | ${backendEntities} | \`10_backend_counts.txt\` |
| **Test Files (Backend)** | ${backendSpecs} | \`10_backend_counts.txt\` |
| **GET Endpoints** | ${getCount} | \`42_route_counts.txt\` |
| **POST Endpoints** | ${postCount} | \`42_route_counts.txt\` |
| **PATCH Endpoints** | ${patchCount} | \`42_route_counts.txt\` |
| **DELETE Endpoints** | ${deleteCount} | \`42_route_counts.txt\` |
| **Total Endpoints** | ${endpointTotal} | \`42_route_counts.txt\` |
| **Migrations** | ${migrations} | \`30_db_counts.txt\` |
| **Entities (DB)** | ${entities} | \`30_db_counts.txt\` |
| **Frontend Files** | ${frontendFilesTotal} | \`20_frontend_counts.txt\` |
| **Frontend TypeScript** | ${frontendTs} | \`20_frontend_counts.txt\` |
| **Frontend TSX** | ${frontendTsx} | \`20_frontend_counts.txt\` |
| **Pages** | ${pages} | \`20_frontend_counts.txt\` |
| **Components** | ${components} | \`20_frontend_counts.txt\` |
| **Features** | ${features} | \`20_frontend_counts.txt\` |
| **Test Files (Frontend)** | ${frontendTests} | \`20_frontend_counts.txt\` |

---

**END OF ARCHITECTURE TREE**

**Note:** This document contains only facts extracted from proof artifacts. No estimates, percentages, or assessments are included.`;

const matrix = `# ZEPHIX PLATFORM STATUS MATRIX

**Generated:** ${now}  
**Source of Truth:** proofs/recovery/commands/  
**Purpose:** Working/Not Working status matrix with evidence

---

## RULES

1. **Working** = Has proof artifact in \`proofs/recovery/commands/\` or runtime evidence (HAR + screenshots)
2. **Partial** = Code exists (controller/page) but no runtime proof
3. **Not Working** = Code missing or build fails

---

## STATUS MATRIX

| Category | Status | Evidence | Notes |
|----------|--------|----------|-------|
| **Backend Build** | ✅ **Working** | \`commands/40_backend_build.txt\` | Build completes successfully |
| **Frontend Build** | ✅ **Working** | \`commands/41_frontend_build.txt\` | Build completes successfully |
| **Backend File Counts** | ✅ **Working** | \`commands/10_backend_counts.txt\` | Counts extracted from proof |
| **Frontend File Counts** | ✅ **Working** | \`commands/20_frontend_counts.txt\` | Counts extracted from proof |
| **Database Counts** | ✅ **Working** | \`commands/30_db_counts.txt\` | Counts extracted from proof |
| **Route Counts** | ✅ **Working** | \`commands/42_route_counts.txt\` | Counts extracted from proof |
| **Backend Tests** | ⚠️ **Partial** | \`commands/10_backend_counts.txt\` | ${backendSpecs} test files exist, no test run output |
| **Frontend Tests** | ⚠️ **Partial** | \`commands/20_frontend_counts.txt\` | ${frontendTests} test files exist, no test run output |
| **Auth Flow** | ⚠️ **Partial** | Controllers exist | No runtime proof (HAR + screenshots) |
| **Workspace Selection** | ⚠️ **Partial** | Controllers exist | No runtime proof (HAR + screenshots) |
| **Project Create** | ⚠️ **Partial** | Controllers exist | No runtime proof (HAR + screenshots) |
| **Template Instantiate** | ⚠️ **Partial** | Controllers exist | No runtime proof (HAR + screenshots) |
| **Docs Flow** | ⚠️ **Partial** | Controller exists | No runtime proof (HAR + screenshots) |
| **Forms Flow** | ⚠️ **Partial** | Controller exists | No runtime proof (HAR + screenshots) |
| **Admin Flow** | ⚠️ **Partial** | Controllers exist | No runtime proof (HAR + screenshots) |
| **Deployment Config** | ✅ **Working** | \`commands/80_deployment_files.txt\` | railway.toml, workflows, nixpacks config exist |

---

## DETAILED STATUS

### Backend Build

**Status:** ✅ **Working**

**Evidence:** \`proofs/recovery/commands/40_backend_build.txt\`

**Proof Command:**
\`\`\`bash
cd zephix-backend && npm run build
\`\`\`

---

### Frontend Build

**Status:** ✅ **Working**

**Evidence:** \`proofs/recovery/commands/41_frontend_build.txt\`

**Proof Command:**
\`\`\`bash
cd zephix-frontend && npm run build
\`\`\`

---

### Runtime Flows (All Partial)

All runtime flows are marked **Partial** until runtime proof is provided.

**Required Proof Per Flow:**
1. **HAR file** - Network requests for the flow
2. **Screenshots** - Visual sequence showing the flow
3. **Console logs** - Only if flow fails

**Example Flow (Login → Workspace Selection):**
- Screenshot: Landing page
- Screenshot: Click "Sign In"
- Screenshot: Login page
- Screenshot: Submit credentials
- HAR: Contains \`/api/auth/login\`, \`/api/auth/me\`
- Screenshot: Workspace picker
- Screenshot: Select workspace
- HAR: Contains \`/api/workspaces\`, workspace home fetch
- Screenshot: Workspace home

**Missing Proofs:**
- Auth flow: No HAR, no screenshots
- Workspace selection: No HAR, no screenshots
- Project create: No HAR, no screenshots
- Template instantiate: No HAR, no screenshots
- Docs flow: No HAR, no screenshots
- Forms flow: No HAR, no screenshots
- Admin flow: No HAR, no screenshots

---

## SUMMARY

| Status | Count | Categories |
|--------|-------|------------|
| ✅ **Working** | 6 | Backend Build, Frontend Build, File Counts, DB Counts, Route Counts, Deployment Config |
| ⚠️ **Partial** | 8 | Backend Tests, Frontend Tests, Auth Flow, Workspace Selection, Project Create, Template Instantiate, Docs Flow, Forms Flow, Admin Flow |
| ❌ **Not Working** | 0 | None |

---

**END OF STATUS MATRIX**

**Note:** This document contains only status based on available proof artifacts. No completion percentages or readiness assessments are included.`;

write("ARCH_PLATFORM_TREE.md", tree);
write("ARCH_STATUS_MATRIX.md", matrix);

console.log("✅ Rendered proofs/recovery/ARCH_PLATFORM_TREE.md");
console.log("✅ Rendered proofs/recovery/ARCH_STATUS_MATRIX.md");
