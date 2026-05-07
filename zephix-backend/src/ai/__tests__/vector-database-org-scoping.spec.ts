import 'reflect-metadata';
import { VectorDatabaseService } from '../vector-database.service';

/**
 * WS-AF-SEC-READ fix verification — read-side + delete-side org scoping closure.
 *
 * Commit 2: searchSimilar requires organizationId; Pinecone query filter populated
 * Commit 3: deleteDocumentVectors requires organizationId; Pinecone delete filter compound
 *
 * Approach: unit-level with mocked Pinecone client. Mirrors WS-AF-SEC Commit 6 pattern
 * (document-upload-org-scoping.spec.ts). AppModule is not booted.
 *
 * Pre-flight finding from Step 1 verification: zero production callers of either method,
 * so this fix is pre-emptive secure-by-default closure. The required-parameter contract
 * forces all future consumers to confront tenancy at the type level.
 */

describe('VectorDatabaseService — read-side + delete-side org scoping (WS-AF-SEC-READ)', () => {
  let service: VectorDatabaseService;
  let querySpy: jest.Mock;
  let deleteManySpy: jest.Mock;

  beforeEach(() => {
    const mockConfig = {
      get: jest.fn().mockReturnValue('zephix-test-index'),
    } as any;
    service = new VectorDatabaseService(mockConfig);

    querySpy = jest.fn().mockResolvedValue({ matches: [] });
    deleteManySpy = jest.fn().mockResolvedValue(undefined);

    (service as any).pinecone = {
      index: jest.fn(() => ({
        query: querySpy,
        deleteMany: deleteManySpy,
      })),
    };
    (service as any).isConfigured = true;
    (service as any).indexName = 'zephix-test-index';
  });

  describe('Commit 2 — searchSimilar populates Pinecone query filter with organization_id', () => {
    it('always includes organization_id in filter when called without searchQuery.filter', async () => {
      await service.searchSimilar([0.1, 0.2, 0.3], 'org-A-uuid', {
        query: 'test',
      });

      expect(querySpy).toHaveBeenCalledTimes(1);
      const queryArgs = querySpy.mock.calls[0][0];
      expect(queryArgs.filter).toBeDefined();
      expect(queryArgs.filter.organization_id).toEqual({ $eq: 'org-A-uuid' });
    });

    it('combines organization_id (from method param) with other filter fields', async () => {
      await service.searchSimilar([0.1, 0.2, 0.3], 'org-B-uuid', {
        query: 'test',
        filter: {
          source_document_id: 'doc-123',
          type: 'paragraph',
          section_level: 2,
        },
      });

      const queryArgs = querySpy.mock.calls[0][0];
      expect(queryArgs.filter.organization_id).toEqual({ $eq: 'org-B-uuid' });
      expect(queryArgs.filter.source_document_id).toEqual({ $eq: 'doc-123' });
      expect(queryArgs.filter.type).toEqual({ $eq: 'paragraph' });
      expect(queryArgs.filter.section_level).toEqual({ $eq: 2 });
    });

    it('method parameter wins when searchQuery.filter.organization_id is also set (defense in depth)', async () => {
      await service.searchSimilar([0.1, 0.2, 0.3], 'org-A-uuid', {
        query: 'test',
        filter: {
          // Caller mistakenly attempts to set a different org via filter
          organization_id: 'org-B-uuid',
        },
      });

      const queryArgs = querySpy.mock.calls[0][0];
      // The method parameter is authoritative; the filter field is ignored
      expect(queryArgs.filter.organization_id).toEqual({ $eq: 'org-A-uuid' });
    });

    it('uses the caller-provided organization_id, not a default', async () => {
      await service.searchSimilar([0.1, 0.2, 0.3], 'org-X-explicit', {
        query: 'test',
      });

      const queryArgs = querySpy.mock.calls[0][0];
      expect(queryArgs.filter.organization_id.$eq).toBe('org-X-explicit');
    });
  });

  describe('Commit 3 — deleteDocumentVectors populates Pinecone delete filter with organization_id', () => {
    it('combines source_document_id AND organization_id in compound filter', async () => {
      await service.deleteDocumentVectors('doc-1', 'org-A-uuid');

      expect(deleteManySpy).toHaveBeenCalledTimes(1);
      const deleteArgs = deleteManySpy.mock.calls[0][0];
      expect(deleteArgs.filter.source_document_id).toEqual({ $eq: 'doc-1' });
      expect(deleteArgs.filter.organization_id).toEqual({ $eq: 'org-A-uuid' });
    });

    it('uses the caller-provided organization_id distinct from documentId', async () => {
      await service.deleteDocumentVectors('doc-id-x', 'org-distinct-uuid');

      const deleteArgs = deleteManySpy.mock.calls[0][0];
      expect(deleteArgs.filter.organization_id.$eq).toBe('org-distinct-uuid');
      expect(deleteArgs.filter.source_document_id.$eq).toBe('doc-id-x');
      // organization_id and source_document_id are distinct fields
      expect(deleteArgs.filter.organization_id.$eq).not.toBe(
        deleteArgs.filter.source_document_id.$eq,
      );
    });
  });

  describe('Type-level — required-parameter contract (signature regression check)', () => {
    it('searchSimilar enforces organizationId at the type level', () => {
      // The @ts-expect-error directive validates the call WITHOUT organizationId fails
      // type checking. If the signature regresses (e.g., organizationId becomes optional
      // or is removed), the directive itself becomes an unused-suppression error and
      // ts-jest fails the test compilation. The wrapper function is never invoked at
      // runtime — this is a pure type-level assertion.
      const verifyTypeError = () => {
        // @ts-expect-error organizationId is required (per WS-AF-SEC-READ Commit 2)
        service.searchSimilar([0.1], { query: 'test' });
      };
      expect(typeof verifyTypeError).toBe('function');
    });

    it('deleteDocumentVectors enforces organizationId at the type level', () => {
      const verifyTypeError = () => {
        // @ts-expect-error organizationId is required (per WS-AF-SEC-READ Commit 3)
        service.deleteDocumentVectors('doc-1');
      };
      expect(typeof verifyTypeError).toBe('function');
    });
  });
});
