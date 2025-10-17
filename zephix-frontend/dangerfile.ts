import { danger, fail, warn, message } from "danger";
import * as fs from "fs";

const changed = danger.git.modified_files.concat(danger.git.created_files);

// 1) Require reports for perf/a11y work
const needsReport = changed.some(f =>
  f.startsWith("src/pages/") || f.includes("components/ui")
);
const reportPaths = [
  "reports/frontend/FRONTEND_VERIFICATION_REPORT.md",
  "reports/frontend/FRONTEND_IMPLEMENTATION_SUMMARY.md"
];
if (needsReport && !reportPaths.some(p => fs.existsSync(p))) {
  fail("Missing verification reports in `reports/frontend/` (perf/a11y evidence).");
}

// 2) Block if backend is touched (front-end sprints)
const backendTouched = changed.some(f => f.startsWith("backend/") || f.includes("zephix-backend"));
if (backendTouched) fail("Backend files changed in a frontend sprint PR.");

// 3) Require CODEOWNERS review (Architect)
if (!danger.github.requested_reviewers?.users?.length) {
  warn("No reviewers requested. Add Architect as a reviewer.");
}

// 4) Gentle nudge for tests when UI changed
const uiChanged = changed.some(f => f.includes("components/ui") || f.includes("DataTable"));
if (uiChanged) {
  const hasTests = changed.some(f => f.match(/__tests__|\.test\./));
  if (!hasTests) warn("UI changed without corresponding tests (foundation set).");
}

// 5) Check for large static assets without lazy loading
const largeAssets = changed.filter(f => 
  f.match(/\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|otf)$/i) && 
  !f.includes("lazy") && 
  !f.includes("dynamic")
);
if (largeAssets.length > 0) {
  warn(`Large static assets added without lazy loading: ${largeAssets.join(", ")}`);
}

// 6) Check for new heavy dependencies
const packageJsonChanged = changed.includes("package.json");
if (packageJsonChanged) {
  message("⚠️ Package.json changed - ensure bundle size impact is documented in PR body");
}

message(`Files changed: ${changed.length}`);
