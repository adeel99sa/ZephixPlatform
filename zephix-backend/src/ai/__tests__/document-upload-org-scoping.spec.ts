import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { DocumentUploadController } from '../document-upload.controller';
import { DocumentParserService } from '../document-parser.service';
import { VectorDatabaseService } from '../vector-database.service';
import { EmbeddingService } from '../embedding.service';
import { OrganizationGuard } from '../../organizations/guards/organization.guard';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

/**
 * WS-AF-SEC fix verification — write-side org scoping closure.
 *
 * Three behavior assertions, one per fix commit:
 *   Commit 1: OrganizationGuard is applied at controller level
 *   Commit 3: uploadDocument threads organizationId from auth context to vector storage
 *   Commit 2: VectorDatabaseService.storeDocumentChunks populates Pinecone metadata.organization_id
 *
 * Approach: unit-level with mocked dependencies. AppModule is not booted.
 */

describe('DocumentUploadController — write-side org scoping (WS-AF-SEC)', () => {
  describe('Commit 1 — OrganizationGuard at controller level', () => {
    it('declares both JwtAuthGuard and OrganizationGuard in the controller guard stack', () => {
      const guards =
        Reflect.getMetadata(GUARDS_METADATA, DocumentUploadController) || [];
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(OrganizationGuard);
    });
  });

  describe('Commit 3 — uploadDocument threads organizationId to vector storage', () => {
    let controller: DocumentUploadController;
    let parser: { validateFile: jest.Mock; parseDocument: jest.Mock };
    let embedding: { generateChunkEmbeddings: jest.Mock };
    let vectorDB: { storeDocumentChunks: jest.Mock };

    beforeEach(async () => {
      parser = {
        validateFile: jest.fn().mockReturnValue({ valid: true }),
        parseDocument: jest.fn().mockResolvedValue({
          success: true,
          document: {
            documentId: 'doc-1',
            filename: 'x.docx',
            chunks: [
              {
                content: 'chunk content',
                type: 'paragraph',
                metadata: { chunk_index: 0 },
              },
            ],
          },
        }),
      };
      embedding = {
        generateChunkEmbeddings: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
      };
      vectorDB = {
        storeDocumentChunks: jest
          .fn()
          .mockResolvedValue({ success: true, storedCount: 1 }),
      };

      const moduleRef: TestingModule = await Test.createTestingModule({
        controllers: [DocumentUploadController],
        providers: [
          { provide: DocumentParserService, useValue: parser },
          { provide: VectorDatabaseService, useValue: vectorDB },
          { provide: EmbeddingService, useValue: embedding },
        ],
      }).compile();

      controller = moduleRef.get(DocumentUploadController);
    });

    it('passes organizationId from auth context as second argument to storeDocumentChunks', async () => {
      const fakeFile = {
        buffer: Buffer.from('fake'),
        originalname: 'x.docx',
      } as any;
      const fakeReq = {
        user: {
          id: 'user-1',
          organizationId: 'org-A-uuid',
        },
      } as any;

      await controller.uploadDocument(fakeFile, fakeReq);

      expect(vectorDB.storeDocumentChunks).toHaveBeenCalledTimes(1);
      const callArgs = vectorDB.storeDocumentChunks.mock.calls[0];
      // Signature post-fix: (documentId, organizationId, chunks, embeddings)
      expect(callArgs[1]).toBe('org-A-uuid');
    });

    it('passes a different organizationId when called from a different tenant', async () => {
      const fakeFile = {
        buffer: Buffer.from('fake'),
        originalname: 'x.docx',
      } as any;
      const fakeReq = {
        user: {
          id: 'user-2',
          organizationId: 'org-B-uuid',
        },
      } as any;

      await controller.uploadDocument(fakeFile, fakeReq);

      const callArgs = vectorDB.storeDocumentChunks.mock.calls[0];
      expect(callArgs[1]).toBe('org-B-uuid');
    });
  });
});

describe('VectorDatabaseService — Pinecone metadata org tagging (WS-AF-SEC Commit 2)', () => {
  let service: VectorDatabaseService;
  let upsertSpy: jest.Mock;

  beforeEach(() => {
    const mockConfig = {
      get: jest.fn().mockReturnValue('zephix-test-index'),
    } as any;
    service = new VectorDatabaseService(mockConfig);

    upsertSpy = jest.fn().mockResolvedValue(undefined);
    // Override the Pinecone client so storeDocumentChunks reaches our spy
    (service as any).pinecone = { index: jest.fn(() => ({ upsert: upsertSpy })) };
    (service as any).isConfigured = true;
    (service as any).indexName = 'zephix-test-index';
  });

  it('populates organization_id in metadata for every stored vector', async () => {
    const chunks = [
      {
        content: 'chunk a',
        type: 'paragraph',
        metadata: { chunk_index: 0 },
      },
      {
        content: 'chunk b',
        type: 'paragraph',
        metadata: { chunk_index: 1 },
      },
    ] as any;
    const embeddings = [
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ];

    const result = await service.storeDocumentChunks(
      'doc-xyz',
      'org-A-uuid',
      chunks,
      embeddings,
    );

    expect(result.success).toBe(true);
    expect(result.storedCount).toBe(2);
    expect(upsertSpy).toHaveBeenCalled();
    const persistedVectors = upsertSpy.mock.calls[0][0] as any[];
    expect(persistedVectors).toHaveLength(2);
    expect(persistedVectors[0].metadata.organization_id).toBe('org-A-uuid');
    expect(persistedVectors[1].metadata.organization_id).toBe('org-A-uuid');
  });

  it('uses the caller-provided organization_id, not a default or the documentId', async () => {
    const chunks = [
      {
        content: 'chunk',
        type: 'paragraph',
        metadata: { chunk_index: 0 },
      },
    ] as any;
    const embeddings = [[0.1, 0.2]];

    await service.storeDocumentChunks(
      'doc-id-x',
      'org-B-uuid',
      chunks,
      embeddings,
    );

    const persistedVectors = upsertSpy.mock.calls[0][0] as any[];
    expect(persistedVectors[0].metadata.organization_id).toBe('org-B-uuid');
    expect(persistedVectors[0].metadata.source_document_id).toBe('doc-id-x');
    // organization_id and source_document_id are distinct fields
    expect(persistedVectors[0].metadata.organization_id).not.toBe('doc-id-x');
  });
});
