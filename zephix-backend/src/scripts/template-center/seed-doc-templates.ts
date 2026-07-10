/**
 * TC-B6 — Seed the starter document catalog (idempotent, docKey-keyed).
 *
 * Writes TWO rows per catalog document:
 *   1. `doc_templates` — the content source (rich_text default content).
 *   2. `templates` (kind='document', SYSTEM, methodology NULL) — so the
 *      Template Center browses documents as first-class catalog citizens.
 *      Linkage: `templates.metadata.docKey` (JSONB — no migration).
 *
 * Idempotent: re-running upserts in place (content refreshes, no dup rows).
 *
 * Requires TEMPLATE_CENTER_SEED_OK=true.
 * Run: npm run template-center:seed:docs
 *
 * Supersedes the earlier TC-1 stub (12 snake_case keys, no content) — the
 * blueprint catalog uses kebab-case keys with authored default content.
 */
import 'reflect-metadata';
import AppDataSource from '../../config/data-source';
import { DocTemplate } from '../../modules/template-center/documents/entities/doc-template.entity';
import { Template } from '../../modules/templates/entities/template.entity';
import {
  DOCUMENT_CATALOG,
  buildDocumentTemplateMetadata,
} from '../../modules/template-center/documents/data/document-catalog';

/** Deterministic template_code for a catalog document's browse row. */
function docTemplateCode(docKey: string): string {
  return `doc.${docKey}`;
}

async function run() {
  if (
    String(process.env.TEMPLATE_CENTER_SEED_OK || '').toLowerCase() !== 'true'
  ) {
    console.error('Set TEMPLATE_CENTER_SEED_OK=true to run this seed.');
    process.exit(1);
  }

  const ds = await AppDataSource.initialize();
  try {
    const docRepo = ds.getRepository(DocTemplate);
    const templateRepo = ds.getRepository(Template);

    let docsCreated = 0;
    let docsUpdated = 0;
    let rowsCreated = 0;
    let rowsUpdated = 0;

    for (const entry of DOCUMENT_CATALOG) {
      // 1. doc_templates content row (idempotent by docKey).
      const existingDoc = await docRepo.findOne({
        where: { docKey: entry.docKey },
      });
      if (existingDoc) {
        existingDoc.name = entry.name;
        existingDoc.category = entry.category;
        existingDoc.contentType = entry.contentType;
        existingDoc.defaultContent = entry.defaultContent as any;
        existingDoc.isActive = true;
        await docRepo.save(existingDoc);
        docsUpdated++;
      } else {
        await docRepo.save(
          docRepo.create({
            docKey: entry.docKey,
            name: entry.name,
            category: entry.category,
            contentType: entry.contentType,
            defaultContent: entry.defaultContent as any,
            isActive: true,
          }),
        );
        docsCreated++;
      }

      // 2. templates browse row (kind='document', SYSTEM, methodology NULL).
      const code = docTemplateCode(entry.docKey);
      const existingRow = await templateRepo.findOne({
        where: { templateCode: code },
      });
      const metadata = buildDocumentTemplateMetadata(entry);
      if (existingRow) {
        existingRow.name = entry.name;
        existingRow.description = entry.description;
        existingRow.category = entry.category;
        existingRow.kind = 'document';
        existingRow.templateScope = 'SYSTEM';
        existingRow.isSystem = true;
        existingRow.methodology = null as any;
        existingRow.organizationId = null as any;
        existingRow.metadata = metadata as any;
        existingRow.isActive = true;
        existingRow.isPublished = true;
        await templateRepo.save(existingRow);
        rowsUpdated++;
      } else {
        await templateRepo.save(
          templateRepo.create({
            name: entry.name,
            templateCode: code,
            description: entry.description,
            category: entry.category,
            kind: 'document',
            methodology: null as any,
            organizationId: null as any,
            createdById: null as any,
            templateScope: 'SYSTEM',
            isActive: true,
            isSystem: true,
            isDefault: false,
            isPublished: true,
            metadata: metadata as any,
          }),
        );
        rowsCreated++;
      }
    }

    console.log(
      `TC-B6 document catalog seed complete:\n` +
        `  doc_templates: ${docsCreated} created, ${docsUpdated} updated\n` +
        `  templates(kind=document): ${rowsCreated} created, ${rowsUpdated} updated\n` +
        `  total catalog docs: ${DOCUMENT_CATALOG.length}`,
    );
  } finally {
    await ds.destroy();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
