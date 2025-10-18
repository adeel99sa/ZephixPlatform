import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

const outDir = "reports/debt";
mkdirSync(outDir, { recursive: true });

function run(cmd) {
  try { return execSync(cmd, { stdio: "pipe" }).toString(); }
  catch (e) { return e.stdout?.toString() || ""; }
}

const eslint = run("eslint --format json --ext .ts,.tsx src || true");
const data = {
  date: new Date().toISOString(),
  eslint: JSON.parse(eslint || "[]"),
};

const path = `${outDir}/debt-${new Date().toISOString().slice(0,10)}.json`;
writeFileSync(path, JSON.stringify(data, null, 2));
console.log("Wrote", path);
