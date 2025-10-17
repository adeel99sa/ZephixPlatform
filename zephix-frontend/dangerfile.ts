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

message(`Files changed: ${changed.length}`);
