/**
 * Phase 5A: Seed manifest writer.
 *
 * Writes manifest to org plan_metadata and to disk for proof.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface SeedManifest {
  seed: number;
  scale: number;
  orgSlug: string;
  createdAt: string;
  version: string;
  counts: Record<string, number>;
  runtimeMs: number;
  skippedTables: string[];
  detectedSchemaHash: string;
  requiredIndexesPresent: string[];
  missingIndexes: string[];
}

/**
 * Build the manifest object. Does not persist.
 */
export function buildManifest(
  seed: number,
  scale: number,
  orgSlug: string,
  counts: Record<string, number>,
  runtimeMs: number,
  skippedTables: string[] = [],
  detectedSchemaHash: string = '',
  requiredIndexesPresent: string[] = [],
  missingIndexes: string[] = [],
): SeedManifest {
  return {
    seed,
    scale,
    orgSlug,
    createdAt: new Date().toISOString(),
    version: '5a.3',
    counts,
    runtimeMs,
    skippedTables,
    detectedSchemaHash,
    requiredIndexesPresent,
    missingIndexes,
  };
}

/**
 * Write manifest JSON + markdown to docs/architecture/proofs/phase5a/.
 */
export function writeManifestToDisk(manifest: SeedManifest): void {
  const dir = path.resolve(
    __dirname,
    '../../../../docs/architecture/proofs/phase5a',
  );
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const base = `seed-manifest-seed-${manifest.seed}`;

  // JSON
  fs.writeFileSync(
    path.join(dir, `${base}.json`),
    JSON.stringify(manifest, null, 2) + '\n',
  );

  // Markdown summary
  const lines: string[] = [
    `# Scale Seed Manifest — seed=${manifest.seed}`,
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| Seed | ${manifest.seed} |`,
    `| Scale | ${manifest.scale} |`,
    `| Org Slug | ${manifest.orgSlug} |`,
    `| Created | ${manifest.createdAt} |`,
    `| Version | ${manifest.version} |`,
    `| Runtime | ${manifest.runtimeMs}ms |`,
    '',
    `## Counts`,
    '',
    `| Table | Rows |`,
    `|-------|------|`,
  ];
  for (const [table, count] of Object.entries(manifest.counts)) {
    lines.push(`| ${table} | ${count.toLocaleString()} |`);
  }
  lines.push('');
  if (manifest.skippedTables.length > 0) {
    lines.push('## Skipped Tables');
    lines.push('');
    for (const t of manifest.skippedTables) {
      lines.push(`- ${t}`);
    }
    lines.push('');
  }
  lines.push(`## Schema Hash`);
  lines.push('');
  lines.push(`\`${manifest.detectedSchemaHash}\``);
  lines.push('');
  if (manifest.requiredIndexesPresent.length > 0 || manifest.missingIndexes.length > 0) {
    lines.push('## Index Parity');
    lines.push('');
    lines.push('### Present');
    for (const idx of manifest.requiredIndexesPresent) {
      lines.push(`- \`${idx}\``);
    }
    lines.push('');
    if (manifest.missingIndexes.length > 0) {
      lines.push('### Missing');
      for (const idx of manifest.missingIndexes) {
        lines.push(`- \`${idx}\``);
      }
      lines.push('');
    }
  }
  fs.writeFileSync(path.join(dir, `${base}.md`), lines.join('\n') + '\n');
}

/**
 * Persist manifest into organization settings.scaleSeed (always exists).
 * Also writes to plan_metadata.scaleSeed if the column exists.
 */
export async function writeManifestToOrg(
  ds: { query: (sql: string, params?: any[]) => Promise<any> },
  orgId: string,
  manifest: SeedManifest,
): Promise<void> {
  // Always write to settings (exists on all DB versions)
  await ds.query(
    `UPDATE organizations
     SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('scaleSeed', $1::jsonb)
     WHERE id = $2`,
    [JSON.stringify(manifest), orgId],
  );

  // Also try plan_metadata if it exists (Phase 3A+)
  try {
    await ds.query(
      `UPDATE organizations
       SET plan_metadata = COALESCE(plan_metadata, '{}'::jsonb) || jsonb_build_object('scaleSeed', $1::jsonb)
       WHERE id = $2`,
      [JSON.stringify(manifest), orgId],
    );
  } catch {
    // plan_metadata column may not exist yet — safe to skip
  }
}
