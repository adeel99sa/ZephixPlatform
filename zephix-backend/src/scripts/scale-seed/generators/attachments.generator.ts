/**
 * Generator 11: Attachments + workspace_storage_usage.
 *
 * Status distribution: uploaded 80%, pending 10%, deleted 10%.
 * Size: 50KB–50MB skewed small. Parent: work_task for simplicity.
 * Storage usage updated atomically per workspace.
 */
import { ScaleSeedConfig } from '../scale-seed.config';
import {
  stableId, batchInsert, fmtTs, seededRng,
  pickFromDistribution, DistributionEntry,
} from '../scale-seed.utils';
import { workspaceId } from './workspaces.generator';
import { userId } from './users.generator';
import { projectId, projectWorkspaceIndex } from './projects.generator';
import { taskId } from './tasks.generator';

const STATUS_DIST: DistributionEntry<string>[] = [
  { value: 'uploaded', pct: 80 },
  { value: 'pending', pct: 10 },
  { value: 'deleted', pct: 10 },
];

const MIME_TYPES = [
  'application/pdf', 'image/png', 'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'application/zip',
];

export async function generateAttachments(
  ds: { query: (sql: string, params?: any[]) => Promise<any> },
  cfg: ScaleSeedConfig,
  orgIdVal: string,
  tasksByProject: Map<number, number>,
  log: (msg: string) => void,
): Promise<{ count: number }> {
  const rng = seededRng(cfg.seed + 11);
  const now = fmtTs(new Date());

  // Track storage per workspace for workspace_storage_usage
  const wsUsed = new Map<number, number>(); // wsIdx → used_bytes
  const wsReserved = new Map<number, number>(); // wsIdx → reserved_bytes

  const cols = [
    'id', 'organization_id', 'workspace_id', 'uploader_user_id',
    'parent_type', 'parent_id', 'file_name', 'mime_type', 'size_bytes',
    'storage_provider', 'bucket', 'storage_key',
    'uploaded_at', 'status', 'created_at', 'updated_at',
  ];

  let rows: any[][] = [];
  let count = 0;

  // Distribute attachments across projects/tasks
  const projectIndices = Array.from(tasksByProject.keys());

  for (let i = 0; i < cfg.attachmentsCount; i++) {
    const pIdx = projectIndices[i % projectIndices.length];
    const taskCount = tasksByProject.get(pIdx) ?? 1;
    const tLocalIdx = i % taskCount;
    const wsIdx = projectWorkspaceIndex(cfg, pIdx);
    const wsId = workspaceId(cfg, wsIdx);
    const uploaderIdx = i % cfg.userCount;

    const status = pickFromDistribution(i, cfg.attachmentsCount, STATUS_DIST);
    const mime = MIME_TYPES[i % MIME_TYPES.length];
    // Size: 50KB–50MB, skewed small via log distribution
    // rng() in [0,1) → exp maps [50KB, 50MB] with small-file bias
    const minLog = Math.log(50_000);
    const maxLog = Math.log(50_000_000);
    const sizeBytes = Math.floor(Math.exp(minLog + rng() * (maxLog - minLog)));
    const ext = mime.split('/').pop()?.replace('plain', 'txt') ?? 'bin';

    const attachId = stableId('attachment', `${cfg.seed}:${i}`);
    const storageKey = `${orgIdVal}/${wsId}/work_task/${taskId(cfg, pIdx, tLocalIdx)}/${attachId}.${ext}`;

    rows.push([
      attachId, orgIdVal, wsId, userId(cfg, uploaderIdx),
      'work_task', taskId(cfg, pIdx, tLocalIdx),
      `file-${String(i).padStart(6, '0')}.${ext}`,
      mime, sizeBytes,
      's3', 'zephix-scale-seed', storageKey,
      status === 'uploaded' ? now : null,
      status,
      now, now,
    ]);

    // Track storage
    if (status === 'uploaded') {
      wsUsed.set(wsIdx, (wsUsed.get(wsIdx) ?? 0) + sizeBytes);
    } else if (status === 'pending') {
      wsReserved.set(wsIdx, (wsReserved.get(wsIdx) ?? 0) + sizeBytes);
    }

    count++;

    if (rows.length >= cfg.batch) {
      await batchInsert(ds, 'attachments', cols, rows, cfg.batch, 'id', log);
      rows = [];
    }
  }

  if (rows.length > 0) {
    await batchInsert(ds, 'attachments', cols, rows, cfg.batch, 'id', log);
  }

  // ─── workspace_storage_usage — use atomic SQL matching production ───
  const storageCols = [
    'id', 'organization_id', 'workspace_id',
    'used_bytes', 'reserved_bytes', 'created_at', 'updated_at',
  ];
  const storageRows: any[][] = [];

  const allWsIndices = new Set([...wsUsed.keys(), ...wsReserved.keys()]);
  for (const wsIdx of allWsIndices) {
    storageRows.push([
      stableId('wsstorage', `${cfg.seed}:${workspaceId(cfg, wsIdx)}`),
      orgIdVal,
      workspaceId(cfg, wsIdx),
      wsUsed.get(wsIdx) ?? 0,
      wsReserved.get(wsIdx) ?? 0,
      now, now,
    ]);
  }

  if (storageRows.length > 0) {
    // Use UPSERT to match production atomic pattern
    for (const row of storageRows) {
      await ds.query(
        `INSERT INTO workspace_storage_usage (id, organization_id, workspace_id, used_bytes, reserved_bytes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (organization_id, workspace_id)
         DO UPDATE SET
           used_bytes = GREATEST(0, workspace_storage_usage.used_bytes + $4),
           reserved_bytes = GREATEST(0, workspace_storage_usage.reserved_bytes + $5),
           updated_at = $7`,
        row,
      );
    }
  }

  return { count };
}
