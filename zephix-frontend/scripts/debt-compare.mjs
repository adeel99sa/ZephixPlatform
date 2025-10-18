import { readdirSync, readFileSync } from "node:fs";

const dir = "reports/debt";
const files = readdirSync(dir).filter(f => f.endsWith(".json")).sort();
if (files.length < 2) {
  console.log("Not enough snapshots to compare.");
  process.exit(0);
}

function summarize(file) {
  const json = JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
  const errs = json.eslint.flatMap((f) => f.messages || []);
  const byRule = errs.reduce((m, e) => (m[e.ruleId||"unknown"]=(m[e.ruleId||"unknown"]||0)+1, m), {});
  const total = errs.length;
  return { file, total, byRule };
}

const prev = summarize(files[files.length-2]);
const curr = summarize(files[files.length-1]);

function diff(a,b){ const out={}; for(const k of new Set([...Object.keys(a),...Object.keys(b)])){ out[k]=(b[k]||0)-(a[k]||0);} return out;}
const ruleDelta = diff(prev.byRule, curr.byRule);

console.log("Lint total delta:", curr.total - prev.total);
console.log("By rule delta:", ruleDelta);
