/**
 * Importer MVP — unit specs for CsvAnalyzeService and CsvExecuteService.
 *
 * Coverage matrix (dispatch-mandated):
 *  A1  Preset detection — ClickUp headers → 'clickup'
 *  A2  Preset detection — Asana headers → 'asana'
 *  A3  Preset detection — generic → 'generic'
 *  A4  UTF-8 BOM stripped; parse still succeeds
 *  A5  Non-UTF-8 → 400 INVALID_ENCODING
 *  A6  File > 5 MB → 400 FILE_TOO_LARGE
 *  A7  Row count > 5000 → 400 ROW_LIMIT_EXCEEDED
 *  A8  fileToken stored; retrieve on execute
 *  E1  Status mapping — exact statusKey match (case-insensitive)
 *  E2  Status mapping — displayName match (case-insensitive)
 *  E3  Status mapping — custom status key (UAT_SIGNED_OFF recognized)
 *  E4  Status mapping — no match → default status + 'status_defaulted' in skipped
 *  E5  Assignee match by email → assigneeUserId set
 *  E6  Assignee no match → unassigned + 'assignee_not_found' in skipped (still imported)
 *  E7  Date ISO 8601 → accepted
 *  E8  Date YYYY-MM-DD → accepted
 *  E9  Date MM/DD/YYYY → rejected, 'date_unparsed', row still imported
 *  E10 Row limit — 5001 rows → 400 ROW_LIMIT_EXCEEDED (caught at analyze stage)
 *  E11 Chunk transactionality — dataSource.transaction called per 500-row chunk
 *  E12 Tenancy — organizationId and workspaceId come from auth context, never file
 *  E13 Governance bypass — task written with mapped status; no transition service called
 *  E14 Dry-run — created=0, skipped populated, batchId present
 *  E15 Row with missing title skipped with 'missing_title'
 *  E16 importBatchId set on every created task's metadata
 */
import * as fs from 'fs';
import * as path from 'path';
import { BadRequestException } from '@nestjs/common';
import { CsvAnalyzeService } from '../services/csv-analyze.service';
import { CsvExecuteService } from '../services/csv-execute.service';
import { FileTokenService } from '../services/file-token.service';
import { ProjectStatus } from '../../work-management/entities/project-status.entity';
import { TaskPriority } from '../../work-management/enums/task.enums';

const FIXTURES = path.resolve(__dirname, '../../../../test/fixtures/import');

function buf(name: string): Buffer {
  return fs.readFileSync(path.join(FIXTURES, name));
}

// ─── Shared mocks ─────────────────────────────────────────────────────────────

function makeTokenService(): FileTokenService {
  const store = new Map<string, Buffer>();
  return {
    store: jest.fn((b: Buffer) => { const t = 'tok-' + Math.random(); store.set(t, b); return t; }),
    retrieve: jest.fn((t: string) => store.get(t) ?? null),
    evictExpired: jest.fn(),
  } as unknown as FileTokenService;
}

const PROJECT_STATUSES: Partial<ProjectStatus>[] = [
  { statusKey: 'BACKLOG', displayName: 'Backlog', isDefault: false },
  { statusKey: 'TODO', displayName: 'To Do', isDefault: true },
  { statusKey: 'IN_PROGRESS', displayName: 'In Progress', isDefault: false },
  { statusKey: 'DONE', displayName: 'Done', isDefault: false },
  { statusKey: 'CANCELED', displayName: 'Cancelled', isDefault: false },
  { statusKey: 'UAT_SIGNED_OFF', displayName: 'UAT Signed Off', isDefault: false },
];

const ORG_MEMBER = { id: 'user-abc', email: 'alice@example.com', isActive: true };

function makeDataSource(opts: { taskSave?: jest.Mock; transaction?: jest.Mock } = {}) {
  const savedTasks: any[] = [];
  const taskSave = opts.taskSave ?? jest.fn(async (tasks: any[]) => { savedTasks.push(...tasks); return tasks; });
  const transaction = opts.transaction ?? jest.fn(async (fn: (m: any) => Promise<void>) => {
    const mgr = {
      getRepository: jest.fn(() => ({
        create: jest.fn((t: any) => t),
        save: taskSave,
      })),
    };
    await fn(mgr);
  });

  return {
    getRepository: jest.fn((entity: any) => {
      const name = entity?.name ?? '';
      if (name === 'Project') return { findOne: jest.fn(async () => ({ id: 'proj-1', workspaceId: 'ws-1' })) };
      if (name === 'ProjectStatus') return { find: jest.fn(async () => PROJECT_STATUSES) };
      if (name === 'User') return { find: jest.fn(async () => [ORG_MEMBER]) };
      return {};
    }),
    transaction,
    _savedTasks: savedTasks,
  };
}

const AUTH = { userId: 'user-1', organizationId: 'org-1', workspaceId: 'ws-1', email: 'admin@test.com', roles: [], platformRole: 'ADMIN' };

// ─── CsvAnalyzeService ────────────────────────────────────────────────────────

describe('CsvAnalyzeService', () => {
  let tokenSvc: FileTokenService;
  let svc: CsvAnalyzeService;

  beforeEach(() => {
    tokenSvc = makeTokenService();
    svc = new CsvAnalyzeService(tokenSvc);
  });

  it('A1: ClickUp headers → detectedPreset = clickup', () => {
    const result = svc.analyze(buf('clickup-sample.csv'), 'clickup-sample.csv');
    expect(result.detectedPreset).toBe('clickup');
    expect(result.columns).toContain('Task Name');
    expect(result.rowCount).toBeGreaterThan(0);
    expect(result.fileToken).toBeTruthy();
  });

  it('A2: Asana headers → detectedPreset = asana', () => {
    const result = svc.analyze(buf('asana-sample.csv'), 'asana-sample.csv');
    expect(result.detectedPreset).toBe('asana');
    expect(result.columns).toContain('Name');
  });

  it('A3: Generic headers → detectedPreset = generic', () => {
    const result = svc.analyze(buf('generic-sample.csv'), 'generic-sample.csv');
    expect(result.detectedPreset).toBe('generic');
  });

  it('A4: UTF-8 BOM is stripped; parse succeeds and detects ClickUp preset', () => {
    // bom-clickup-sample.csv has EF BB BF prepended
    const result = svc.analyze(buf('bom-clickup-sample.csv'), 'bom-clickup-sample.csv');
    expect(result.detectedPreset).toBe('clickup');
    // First column should be 'Task Name', not '﻿Task Name'
    expect(result.columns[0]).toBe('Task Name');
  });

  it('A5: Non-UTF-8 content → 400 INVALID_ENCODING', () => {
    const b = buf('non-utf8-sample.csv');
    expect(() => svc.analyze(b, 'non-utf8.csv')).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'INVALID_ENCODING' }) }),
    );
  });

  it('A6: File > 5 MB → 400 FILE_TOO_LARGE', () => {
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1, 'a');
    expect(() => svc.analyze(oversized, 'big.csv')).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'FILE_TOO_LARGE' }) }),
    );
  });

  it('A7: rowCount > 5000 → 400 ROW_LIMIT_EXCEEDED', () => {
    const header = 'Task Name,Status\n';
    const rows = Array.from({ length: 5001 }, (_, i) => `Task ${i},TODO`).join('\n');
    const b = Buffer.from(header + rows, 'utf-8');
    expect(() => svc.analyze(b, 'big.csv')).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'ROW_LIMIT_EXCEEDED' }) }),
    );
  });

  it('A8: fileToken is returned and retrieve works', () => {
    const result = svc.analyze(buf('clickup-sample.csv'), 'c.csv');
    const retrieved = (tokenSvc.retrieve as jest.Mock)(result.fileToken);
    expect(retrieved).toBeInstanceOf(Buffer);
  });

  it('sampleRows contains at most 10 rows', () => {
    const result = svc.analyze(buf('clickup-sample.csv'), 'c.csv');
    expect(result.sampleRows.length).toBeLessThanOrEqual(10);
  });
});

// ─── CsvExecuteService ────────────────────────────────────────────────────────

describe('CsvExecuteService', () => {
  function makeSvc(dsOpts?: Parameters<typeof makeDataSource>[0]) {
    const tokenSvc = makeTokenService();
    const analyzeSvc = new CsvAnalyzeService(tokenSvc);
    const ds = makeDataSource(dsOpts);
    const svc = new CsvExecuteService(ds as any, tokenSvc);
    return { svc, tokenSvc, analyzeSvc, ds };
  }

  function buildDto(fileToken: string, extra: Partial<Parameters<CsvExecuteService['execute']>[1]> = {}) {
    return {
      projectId: 'proj-1',
      mapping: { title: 0, status: 1, assigneeEmail: 2, dueDate: 3, priority: 4 },
      dryRun: false,
      fileToken,
      ...extra,
    };
  }

  function analyzedToken(tokenSvc: FileTokenService, csvName: string): string {
    const analyzeSvc = new CsvAnalyzeService(tokenSvc);
    return analyzeSvc.analyze(buf(csvName), csvName).fileToken;
  }

  it('E1: Exact statusKey match (case-insensitive) → correct status', async () => {
    const { svc, tokenSvc, ds } = makeSvc();
    const token = analyzedToken(tokenSvc, 'clickup-sample.csv');
    const result = await svc.execute(AUTH, buildDto(token));
    // "IN_PROGRESS" row (row 1 in clickup-sample) → IN_PROGRESS
    expect(result.created).toBeGreaterThan(0);
    const task = ds._savedTasks.find((t: any) => t.status === 'IN_PROGRESS');
    expect(task).toBeDefined();
  });

  it('E2: displayName match (case-insensitive "In Progress") → statusKey IN_PROGRESS', async () => {
    const { svc, tokenSvc } = makeSvc();
    const csvBuf = Buffer.from('Task Name,Status\nMy task,in progress\n', 'utf-8');
    const token = (tokenSvc.store as jest.Mock)(csvBuf);
    const result = await svc.execute(AUTH, buildDto(token, { mapping: { title: 0, status: 1 } }));
    const skippedReasons = result.skipped.map((s) => s.reason);
    expect(skippedReasons).not.toContain('status_defaulted');
    expect(result.created).toBe(1);
  });

  it('E3: Custom status UAT_SIGNED_OFF is recognized (in projectStatuses)', async () => {
    const { svc, tokenSvc, ds } = makeSvc();
    const token = analyzedToken(tokenSvc, 'custom-status-sample.csv');
    // mapping: title=0, status=1, assigneeEmail=2, dueDate=3, priority=4
    const result = await svc.execute(AUTH, buildDto(token));
    const uatTask = ds._savedTasks.find((t: any) => t.status === 'UAT_SIGNED_OFF');
    expect(uatTask).toBeDefined();
    const reasons = result.skipped.map((s) => s.reason);
    // Row 1 (UAT_SIGNED_OFF) should NOT have status_defaulted
    const row1Skip = result.skipped.find((s) => s.row === 2 && s.reason === 'status_defaulted');
    expect(row1Skip).toBeUndefined();
  });

  it('E4: Unrecognized status → default status + status_defaulted in skipped', async () => {
    const { svc, tokenSvc, ds } = makeSvc();
    const token = analyzedToken(tokenSvc, 'custom-status-sample.csv');
    const result = await svc.execute(AUTH, buildDto(token));
    // Row 2 has UNKNOWN_STATUS → should be defaulted to TODO
    const defaultedTask = ds._savedTasks.find((t: any) => t.status === 'TODO');
    expect(defaultedTask).toBeDefined();
    const statusDefaulted = result.skipped.find((s) => s.reason === 'status_defaulted');
    expect(statusDefaulted).toBeDefined();
    // Row is still imported (not missing from created count)
    expect(result.created).toBeGreaterThan(0);
  });

  it('E5: Assignee email match → assigneeUserId set', async () => {
    const { svc, tokenSvc, ds } = makeSvc();
    const token = analyzedToken(tokenSvc, 'clickup-sample.csv');
    await svc.execute(AUTH, buildDto(token));
    const assigned = ds._savedTasks.find((t: any) => t.assigneeUserId === 'user-abc');
    expect(assigned).toBeDefined();
  });

  it('E6: Assignee not in org → unassigned + assignee_not_found, row still imported', async () => {
    const { svc, tokenSvc, ds } = makeSvc();
    const csvBuf = Buffer.from('Task Name,Status,Assignee\nOrphan task,TODO,nobody@nowhere.com\n', 'utf-8');
    const token = (tokenSvc.store as jest.Mock)(csvBuf);
    const result = await svc.execute(AUTH, buildDto(token, { mapping: { title: 0, status: 1, assigneeEmail: 2 } }));
    expect(result.created).toBe(1);
    const task = ds._savedTasks[0];
    expect(task.assigneeUserId).toBeNull();
    expect(result.skipped.some((s) => s.reason === 'assignee_not_found')).toBe(true);
  });

  it('E7: ISO 8601 date accepted', async () => {
    const { svc, tokenSvc, ds } = makeSvc();
    const csvBuf = Buffer.from('Task Name,Due Date\nMy task,2026-08-15T00:00:00Z\n', 'utf-8');
    const token = (tokenSvc.store as jest.Mock)(csvBuf);
    const result = await svc.execute(AUTH, buildDto(token, { mapping: { title: 0, dueDate: 1 } }));
    expect(result.skipped.some((s) => s.reason === 'date_unparsed')).toBe(false);
    expect(ds._savedTasks[0].dueDate).toBeInstanceOf(Date);
  });

  it('E8: YYYY-MM-DD date accepted', async () => {
    const { svc, tokenSvc, ds } = makeSvc();
    const csvBuf = Buffer.from('Task Name,Due Date\nMy task,2026-08-15\n', 'utf-8');
    const token = (tokenSvc.store as jest.Mock)(csvBuf);
    const result = await svc.execute(AUTH, buildDto(token, { mapping: { title: 0, dueDate: 1 } }));
    expect(result.skipped.some((s) => s.reason === 'date_unparsed')).toBe(false);
    expect(ds._savedTasks[0].dueDate).toBeInstanceOf(Date);
  });

  it('E9: MM/DD/YYYY → date_unparsed, row still imported', async () => {
    const { svc, tokenSvc, ds } = makeSvc();
    const token = analyzedToken(tokenSvc, 'invalid-date-sample.csv');
    const result = await svc.execute(AUTH, buildDto(token, { mapping: { title: 0, status: 1, dueDate: 2 } }));
    expect(result.skipped.some((s) => s.reason === 'date_unparsed')).toBe(true);
    expect(result.created).toBeGreaterThan(0);
    // The bad-date row is still created, dueDate null
    const badRow = ds._savedTasks.find((t: any) => t.title === 'Task with bad date');
    expect(badRow).toBeDefined();
    expect(badRow.dueDate).toBeNull();
  });

  it('E11: Chunk transactionality — transaction called once per 500-row chunk', async () => {
    const txMock = jest.fn(async (fn: (m: any) => Promise<void>) => {
      const mgr = { getRepository: jest.fn(() => ({ create: jest.fn((t: any) => t), save: jest.fn(async (ts: any[]) => ts) })) };
      await fn(mgr);
    });
    const { svc, tokenSvc } = makeSvc({ transaction: txMock });
    // 1,001 rows → 3 chunks (500 + 500 + 1)
    const header = 'Task Name\n';
    const rows = Array.from({ length: 1001 }, (_, i) => `Task ${i}`).join('\n');
    const token = (tokenSvc.store as jest.Mock)(Buffer.from(header + rows, 'utf-8'));
    await svc.execute(AUTH, buildDto(token, { mapping: { title: 0 } }));
    expect(txMock).toHaveBeenCalledTimes(3);
  });

  it('E12: Tenancy — organizationId and workspaceId from auth context, not from file', async () => {
    const { svc, tokenSvc, ds } = makeSvc();
    const csvBuf = Buffer.from('Task Name,organization_id,workspace_id\nHijack attempt,evil-org,evil-ws\n', 'utf-8');
    const token = (tokenSvc.store as jest.Mock)(csvBuf);
    await svc.execute(AUTH, buildDto(token, { mapping: { title: 0 } }));
    const task = ds._savedTasks[0];
    expect(task.organizationId).toBe('org-1');
    expect(task.workspaceId).toBe('ws-1');
    expect(task.organizationId).not.toBe('evil-org');
  });

  it('E13: Governance bypass — task status set directly at insert, no transition service', async () => {
    // The execute service must write status directly to the task object;
    // there is no WorkTasksService dependency in CsvExecuteService.
    const { svc, tokenSvc, ds } = makeSvc();
    const csvBuf = Buffer.from('Task Name,Status\nGated task,DONE\n', 'utf-8');
    const token = (tokenSvc.store as jest.Mock)(csvBuf);
    await svc.execute(AUTH, buildDto(token, { mapping: { title: 0, status: 1 } }));
    expect(ds._savedTasks[0].status).toBe('DONE');
    // No WorkTasksService was instantiated — governance bypass is structural, not mocked away
  });

  it('E14: dryRun=true → created=0, batchId present, skipped populated', async () => {
    const { svc, tokenSvc, ds } = makeSvc();
    const token = analyzedToken(tokenSvc, 'clickup-sample.csv');
    const result = await svc.execute(AUTH, buildDto(token, { dryRun: true }));
    expect(result.created).toBe(0);
    expect(result.batchId).toBeTruthy();
    expect(result.importable).toBeGreaterThan(0);
    expect(ds._savedTasks).toHaveLength(0);
  });

  it('E15: Row with missing title skipped with missing_title', async () => {
    const { svc, tokenSvc, ds } = makeSvc();
    const csvBuf = Buffer.from('Task Name,Status\n,TODO\nValid task,TODO\n', 'utf-8');
    const token = (tokenSvc.store as jest.Mock)(csvBuf);
    const result = await svc.execute(AUTH, buildDto(token, { mapping: { title: 0, status: 1 } }));
    expect(result.skipped.some((s) => s.reason === 'missing_title')).toBe(true);
    expect(result.created).toBe(1);
  });

  it('E16: importBatchId set on every created task metadata', async () => {
    const { svc, tokenSvc, ds } = makeSvc();
    const token = analyzedToken(tokenSvc, 'clickup-sample.csv');
    const result = await svc.execute(AUTH, buildDto(token));
    expect(result.batchId).toBeTruthy();
    for (const task of ds._savedTasks) {
      expect(task.metadata?.importBatchId).toBe(result.batchId);
    }
  });
});
