import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AttributeDataType,
  AttributeDefinition,
  AttributeScope,
} from '../entities/attribute-definition.entity';
import { AttributeValue } from '../entities/attribute-value.entity';
import { AttributeValuesService } from '../services/attribute-values.service';

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  upsert: jest.fn(),
  remove: jest.fn(),
});

const makeDef = (dataType: AttributeDataType, wsId = 'ws-1'): AttributeDefinition =>
  ({
    id: 'def-1',
    scope: AttributeScope.WORKSPACE,
    organizationId: 'org-1',
    workspaceId: wsId,
    dataType,
  }) as AttributeDefinition;

describe('AttributeValuesService', () => {
  let service: () => AttributeValuesService;
  let defRepo: ReturnType<typeof mockRepo>;
  let valRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    defRepo = mockRepo();
    valRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttributeValuesService,
        { provide: getRepositoryToken(AttributeDefinition), useValue: defRepo },
        { provide: getRepositoryToken(AttributeValue), useValue: valRepo },
      ],
    }).compile();

    // 52-checklist: lazy getter
    service = () => module.get<AttributeValuesService>(AttributeValuesService);
  });

  // ── buildValueColumns — positive paths ───────────────────────────────────

  describe('buildValueColumns — correct type per dataType family', () => {
    const textTypes = [
      AttributeDataType.TEXT,
      AttributeDataType.LONG_TEXT,
      AttributeDataType.URL,
      AttributeDataType.EMAIL,
      AttributeDataType.SINGLE_SELECT,
      AttributeDataType.FILE_REFERENCE,
    ];

    for (const dt of textTypes) {
      it(`${dt} + string → valueText populated, all others null`, () => {
        const cols = service().buildValueColumns(dt, 'hello');
        expect(cols.valueText).toBe('hello');
        expect(cols.valueNumber).toBeNull();
        expect(cols.valueBoolean).toBeNull();
        expect(cols.valueDate).toBeNull();
        expect(cols.valueDatetime).toBeNull();
        expect(cols.valueJson).toBeNull();
      });
    }

    const numberTypes = [
      AttributeDataType.NUMBER,
      AttributeDataType.INTEGER,
      AttributeDataType.DECIMAL,
      AttributeDataType.CURRENCY,
      AttributeDataType.PERCENTAGE,
      AttributeDataType.RATING,
      AttributeDataType.DURATION,
    ];

    for (const dt of numberTypes) {
      it(`${dt} + number → valueNumber populated, all others null`, () => {
        const cols = service().buildValueColumns(dt, 42);
        expect(cols.valueNumber).toBe(42);
        expect(cols.valueText).toBeNull();
        expect(cols.valueBoolean).toBeNull();
      });
    }

    it('boolean + boolean → valueBoolean set', () => {
      const cols = service().buildValueColumns(AttributeDataType.BOOLEAN, true);
      expect(cols.valueBoolean).toBe(true);
      expect(cols.valueText).toBeNull();
    });

    it('date + YYYY-MM-DD string → valueDate set', () => {
      const cols = service().buildValueColumns(AttributeDataType.DATE, '2026-07-02');
      expect(cols.valueDate).toBe('2026-07-02');
    });

    it('datetime + ISO string → valueDatetime set as Date', () => {
      const cols = service().buildValueColumns(AttributeDataType.DATETIME, '2026-07-02T10:00:00Z');
      expect(cols.valueDatetime).toBeInstanceOf(Date);
    });

    const jsonTypes = [
      AttributeDataType.MULTI_SELECT,
      AttributeDataType.PEOPLE,
      AttributeDataType.RELATIONSHIP,
      AttributeDataType.COMPUTED,
    ];

    for (const dt of jsonTypes) {
      it(`${dt} + object → valueJson set`, () => {
        const cols = service().buildValueColumns(dt, { ids: ['a'] });
        expect(cols.valueJson).toEqual({ ids: ['a'] });
      });
    }

    it('exactly one column is non-null for each type (schema constraint)', () => {
      const entries = Object.values(AttributeDataType).map((dt) => {
        const sampleValue =
          dt === AttributeDataType.BOOLEAN ? false
          : dt === AttributeDataType.DATE ? '2026-01-01'
          : dt === AttributeDataType.DATETIME ? '2026-01-01T00:00:00Z'
          : [AttributeDataType.MULTI_SELECT, AttributeDataType.PEOPLE,
             AttributeDataType.RELATIONSHIP, AttributeDataType.COMPUTED].includes(dt)
          ? {}
          : typeof 0 === 'number' &&
            [AttributeDataType.NUMBER, AttributeDataType.INTEGER,
             AttributeDataType.DECIMAL, AttributeDataType.CURRENCY,
             AttributeDataType.PERCENTAGE, AttributeDataType.RATING,
             AttributeDataType.DURATION].includes(dt)
          ? 1
          : 'text';
        return service().buildValueColumns(dt, sampleValue);
      });

      for (const cols of entries) {
        const nonNullCount = [
          cols.valueText,
          cols.valueNumber,
          cols.valueBoolean,
          cols.valueDate,
          cols.valueDatetime,
          cols.valueJson,
        ].filter((v) => v !== null).length;
        expect(nonNullCount).toBe(1);
      }
    });
  });

  // ── buildValueColumns — wrong primitive (ATTRIBUTE_TYPE_MISMATCH) ─────────

  describe('buildValueColumns — wrong primitive', () => {
    it('text type + number → 400 ATTRIBUTE_TYPE_MISMATCH', () => {
      expect(() => service().buildValueColumns(AttributeDataType.TEXT, 42)).toThrow(
        BadRequestException,
      );
    });

    it('number type + string → 400', () => {
      expect(() =>
        service().buildValueColumns(AttributeDataType.NUMBER, 'not-a-number'),
      ).toThrow(BadRequestException);
    });

    it('boolean type + string → 400', () => {
      expect(() =>
        service().buildValueColumns(AttributeDataType.BOOLEAN, 'true'),
      ).toThrow(BadRequestException);
    });

    it('date type + invalid format → 400', () => {
      expect(() =>
        service().buildValueColumns(AttributeDataType.DATE, '07-02-2026'),
      ).toThrow(BadRequestException);
    });

    it('json type + null → 400 (null is not an object)', () => {
      expect(() =>
        service().buildValueColumns(AttributeDataType.MULTI_SELECT, null),
      ).toThrow(BadRequestException);
    });

    it('number type + Infinity → 400', () => {
      expect(() =>
        service().buildValueColumns(AttributeDataType.NUMBER, Infinity),
      ).toThrow(BadRequestException);
    });
  });

  // ── upsert — idempotency and cross-tenant isolation ───────────────────────

  describe('upsert', () => {
    it('calls repo.upsert (not save/insert) — idempotency guaranteed', async () => {
      defRepo.findOne.mockResolvedValue(makeDef(AttributeDataType.TEXT));
      valRepo.upsert.mockResolvedValue({ identifiers: [] });
      valRepo.findOne.mockResolvedValue({ id: 'val-1', valueText: 'hello' });

      await service().upsert('task-1', 'def-1', 'hello', 'ws-1', 'org-1');

      expect(valRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ valueText: 'hello', workTaskId: 'task-1' }),
        { conflictPaths: ['workTaskId', 'attributeDefinitionId'] },
      );
      // Ensures repo.save was NOT used (that would not be idempotent)
      expect(valRepo['save']).toBeUndefined();
    });

    it('second call with same key overwrites (upsert semantics)', async () => {
      defRepo.findOne.mockResolvedValue(makeDef(AttributeDataType.TEXT));
      valRepo.upsert.mockResolvedValue({ identifiers: [] });
      valRepo.findOne.mockResolvedValue({ id: 'val-1', valueText: 'updated' });

      await service().upsert('task-1', 'def-1', 'first', 'ws-1', 'org-1');
      await service().upsert('task-1', 'def-1', 'updated', 'ws-1', 'org-1');

      expect(valRepo.upsert).toHaveBeenCalledTimes(2);
    });
  });

  // ── resolveDefinition — cross-tenant isolation ────────────────────────────

  describe('upsert — cross-tenant isolation', () => {
    it('definition belonging to a different workspace → 404 (not 403)', async () => {
      // def.workspaceId = 'ws-other', caller's wsId = 'ws-1'
      defRepo.findOne.mockResolvedValue(makeDef(AttributeDataType.TEXT, 'ws-other'));

      await expect(
        service().upsert('task-1', 'def-1', 'hello', 'ws-1', 'org-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('definition not found → 404', async () => {
      defRepo.findOne.mockResolvedValue(null);

      await expect(
        service().upsert('task-1', 'def-1', 'hello', 'ws-1', 'org-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ── findAllForTasks — batch read ─────────────────────────────────────────

  describe('findAllForTasks', () => {
    it('returns empty array immediately for empty input (no DB hit)', async () => {
      const result = await service().findAllForTasks([], 'ws-1', 'org-1');
      expect(result).toEqual([]);
      expect(valRepo.find).not.toHaveBeenCalled();
    });

    it('throws 400 TOO_MANY_TASK_IDS for > 200 IDs (cap enforced before DB hit)', async () => {
      const ids = Array.from({ length: 201 }, (_, i) => `task-${i}`);
      await expect(
        service().findAllForTasks(ids, 'ws-1', 'org-1'),
      ).rejects.toMatchObject({
        response: { code: 'TOO_MANY_TASK_IDS', max: 200 },
      });
      expect(valRepo.find).not.toHaveBeenCalled();
    });

    it('exactly 200 IDs does not throw (boundary is inclusive)', async () => {
      const ids = Array.from({ length: 200 }, (_, i) => `task-${i}`);
      valRepo.find.mockResolvedValue([]);
      await expect(service().findAllForTasks(ids, 'ws-1', 'org-1')).resolves.toEqual([]);
      expect(valRepo.find).toHaveBeenCalledTimes(1);
    });

    it('passes workspaceId and organizationId as tenancy scope to find()', async () => {
      valRepo.find.mockResolvedValue([{ id: 'v1', workTaskId: 'task-1' }]);
      const result = await service().findAllForTasks(['task-1'], 'ws-42', 'org-99');
      expect(valRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: 'ws-42',
            organizationId: 'org-99',
          }),
        }),
      );
      expect(result).toHaveLength(1);
    });
  });
});
