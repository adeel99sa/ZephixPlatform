import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * TC-B6 — payload for POST /api/projects/:projectId/documents/from-template.
 * Creates a document_instance from a catalog document template, with merge
 * fields resolved once from the live project.
 */
export class AttachDocumentFromTemplateDto {
  /** Catalog document key (e.g. 'project-charter'). */
  @IsString()
  @MaxLength(120)
  docKey: string;

  /**
   * Optional canonical gate key (platform.gate.*) this document's evidence
   * blocks. Validated against the project's existing phase gate definitions.
   */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  blocksGateKey?: string;
}
