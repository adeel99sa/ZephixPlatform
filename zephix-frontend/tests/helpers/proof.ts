/**
 * Proof artifact writer for the UI acceptance smoke lane.
 *
 * Writes screenshots, HTML snapshots, step logs, and the final README
 * to docs/architecture/proofs/staging/ui-acceptance-latest/ (gitignored).
 *
 * The proof dir can be overridden via UI_ACCEPTANCE_PROOF_DIR env var.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { type Page } from '@playwright/test';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PROOF_DIR = path.resolve(
  __dirname,
  '../../../..',
  'docs/architecture/proofs/staging/ui-acceptance-latest',
);

export function getProofDir(): string {
  return process.env.UI_ACCEPTANCE_PROOF_DIR || DEFAULT_PROOF_DIR;
}

export function ensureProofDir(): void {
  fs.mkdirSync(getProofDir(), { recursive: true });
}

/**
 * Take a screenshot and save it to the proof dir.
 */
export async function saveScreenshot(page: Page, name: string): Promise<void> {
  ensureProofDir();
  const file = path.join(getProofDir(), `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
}

/**
 * Save the current page HTML to the proof dir (used on failures).
 */
export async function saveHtmlSnapshot(page: Page, name: string): Promise<void> {
  ensureProofDir();
  const file = path.join(getProofDir(), `${name}.html`);
  const html = await page.content();
  fs.writeFileSync(file, html, 'utf-8');
}

/**
 * Append a line to the step log.
 */
export function stepLog(step: string, result: 'PASS' | 'FAIL' | 'SKIP', detail?: string): void {
  ensureProofDir();
  const logFile = path.join(getProofDir(), 'steps.log');
  const ts = new Date().toISOString();
  const line = `${ts}  ${result.padEnd(4)}  ${step}${detail ? `  ${detail}` : ''}\n`;
  fs.appendFileSync(logFile, line, 'utf-8');
}

export interface ProofMeta {
  run_id: string;
  date_utc: string;
  staging_base: string;
  frontend_base: string;
  commit_sha: string;
  railway_deployment_id: string;
  result: 'PASS' | 'FAIL';
  first_failure_step?: string;
  entity_ids: Record<string, string>;
}

/**
 * Write the final README.md to the proof dir.
 */
export function writeReadme(meta: ProofMeta): void {
  ensureProofDir();
  const readmePath = path.join(getProofDir(), 'README.md');

  const entitySection =
    Object.entries(meta.entity_ids)
      .map(([k, v]) => `- ${k}: \`${v}\``)
      .join('\n') || '- (none)';

  const content = `# UI Acceptance Proof

| Field | Value |
|-------|-------|
| result | **${meta.result}** |
| run_id | \`${meta.run_id}\` |
| date_utc | ${meta.date_utc} |
| staging_base | ${meta.staging_base} |
| frontend_base | ${meta.frontend_base} |
| commit_sha | \`${meta.commit_sha}\` |
| railway_deployment_id | \`${meta.railway_deployment_id}\` |
${meta.first_failure_step ? `| first_failure_step | **${meta.first_failure_step}** |` : ''}

## Created entities (create-only, not deleted)

${entitySection}

## Step log

See \`steps.log\` in this directory.
`;
  fs.writeFileSync(readmePath, content, 'utf-8');
}

/**
 * Save arbitrary JSON to the proof dir.
 */
export function saveJson(name: string, data: unknown): void {
  ensureProofDir();
  const file = path.join(getProofDir(), `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}
