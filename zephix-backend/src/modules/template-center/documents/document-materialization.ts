/**
 * TC-B6 — Document instance materialization (shared).
 *
 * Creates a document_instance + its version-1 row from a catalog document
 * template, with merge fields resolved ONCE from live project data. Used by
 * BOTH:
 *   - the attach flow (POST /projects/:id/documents/from-template), and
 *   - instantiate-v5_1 bundle materialization (docKeys on template phases).
 *
 * It is a plain function taking an EntityManager (not a Nest provider) so the
 * `templates` module's instantiate service can reuse it inside its own
 * transaction without importing a `template-center` provider (no circular
 * module dependency; entity + pure-function imports only).
 */
import { EntityManager } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { DocTemplate } from './entities/doc-template.entity';
import { DocumentInstance } from './entities/document-instance.entity';
import { DocumentVersion } from './entities/document-version.entity';
import {
  gatherMergeInputs,
  buildMergeTokenMap,
  substituteMergeTokens,
} from './merge-field-resolver.service';

export interface MaterializeDocumentParams {
  project: Project;
  /** Resolved doc_templates row (content source + name/contentType). */
  docTemplate: DocTemplate;
  ownerId: string;
  blocksGateKey?: string | null;
  phaseKey?: string | null;
  isRequired?: boolean;
  /** Defaults to 'draft' — an attached doc is immediately editable. */
  status?: string;
}

export interface MaterializeDocumentResult {
  instance: DocumentInstance;
  unresolvedFields: string[];
}

/**
 * Materialize one document instance (+ version 1) for a project.
 *
 * Merge resolution reads via the SAME manager, so during instantiate it sees
 * the project + phases written earlier in the transaction.
 */
export async function materializeDocumentInstance(
  manager: EntityManager,
  params: MaterializeDocumentParams,
): Promise<MaterializeDocumentResult> {
  const {
    project,
    docTemplate,
    ownerId,
    blocksGateKey = null,
    phaseKey = null,
    isRequired = false,
    status = 'draft',
  } = params;

  // Resolve merge fields from live project data.
  const inputs = await gatherMergeInputs(manager, project);
  const tokenMap = buildMergeTokenMap(inputs);
  const { content: resolvedContent, unresolvedFields } = substituteMergeTokens(
    docTemplate.defaultContent ?? null,
    tokenMap,
  );

  const instanceRepo = manager.getRepository(DocumentInstance);
  const versionRepo = manager.getRepository(DocumentVersion);

  const instance = instanceRepo.create({
    projectId: project.id,
    docTemplateId: docTemplate.id,
    docKey: docTemplate.docKey,
    name: docTemplate.name,
    contentType: docTemplate.contentType,
    status,
    ownerId,
    reviewerIds: [],
    phaseKey,
    currentVersion: 1,
    isRequired,
    blocksGateKey,
  });
  const savedInstance = await instanceRepo.save(instance);

  const version = versionRepo.create({
    documentInstanceId: savedInstance.id,
    versionNumber: 1,
    content: resolvedContent,
    changeSummary: 'Created from document template',
    createdBy: ownerId,
  });
  await versionRepo.save(version);

  return { instance: savedInstance, unresolvedFields };
}
