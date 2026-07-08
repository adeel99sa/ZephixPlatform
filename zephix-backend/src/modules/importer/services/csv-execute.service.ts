import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { FileTokenService } from './file-token.service';
import { parseCsvRow } from './csv-analyze.service';
import { ExecuteCsvDto, ExecuteCsvResponseDto, SkippedRowDto } from '../dto/execute-csv.dto';
import { WorkTask } from '../../work-management/entities/work-task.entity';
import { ProjectStatus } from '../../work-management/entities/project-status.entity';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { DEFAULT_STATUS_KEYS } from '../../work-management/entities/work-task.entity';
import { TaskPriority } from '../../work-management/enums/task.enums';
import { getAuthContext } from '../../../common/http/get-auth-context';

type AuthContext = ReturnType<typeof getAuthContext> & { workspaceId: string };

const BATCH_SIZE = 500;

// Only ISO 8601 and YYYY-MM-DD are accepted in v1.
// MM/DD/YYY and DD/MM ambiguity is intentionally rejected.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;

const PRIORITY_MAP: Record<string, TaskPriority> = {
  urgent: TaskPriority.HIGH, // no URGENT tier — maps to HIGH
  high: TaskPriority.HIGH,
  normal: TaskPriority.MEDIUM,
  medium: TaskPriority.MEDIUM,
  low: TaskPriority.LOW,
};

@Injectable()
export class CsvExecuteService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly fileTokenService: FileTokenService,
  ) {}

  async execute(auth: AuthContext, dto: ExecuteCsvDto): Promise<ExecuteCsvResponseDto> {
    const buf = this.fileTokenService.retrieve(dto.fileToken);
    if (!buf) {
      throw new BadRequestException({
        code: 'FILE_TOKEN_EXPIRED',
        message: 'File token not found or expired (30-minute TTL)',
      });
    }

    // Verify project belongs to caller's workspace
    const project = await this.dataSource
      .getRepository(Project)
      .findOne({ where: { id: dto.projectId } });
    if (!project) {
      throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
    }
    if (project.workspaceId !== auth.workspaceId) {
      throw new ForbiddenException({
        code: 'PROJECT_NOT_IN_WORKSPACE',
        message: 'Project does not belong to caller workspace',
      });
    }

    // Load project statuses for status resolution
    const projectStatuses = await this.dataSource
      .getRepository(ProjectStatus)
      .find({ where: { projectId: dto.projectId } });

    const defaultStatus = resolveDefaultStatus(projectStatuses);

    // Build status lookup: statusKey (case-insensitive) ∪ displayName (case-insensitive)
    const statusLookup = buildStatusLookup(projectStatuses);

    // Load org members for assignee resolution
    const orgMembers = await this.dataSource
      .getRepository(User)
      .find({ where: { organizationId: auth.organizationId, isActive: true } });
    const memberByEmail = new Map(orgMembers.map((u) => [u.email.toLowerCase(), u.id]));

    // Parse CSV
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    const [headerLine, ...dataLines] = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const columns = parseCsvRow(headerLine);
    const { mapping } = dto;

    const batchId = randomUUID();
    const skipped: SkippedRowDto[] = [];
    const tasksToInsert: Partial<WorkTask>[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 2; // 1-indexed, +1 for header
      const fields = parseCsvRow(dataLines[i]);

      const titleRaw = fields[mapping.title]?.trim();
      if (!titleRaw) {
        skipped.push({ row: rowNum, reason: 'missing_title' });
        continue;
      }

      // Status resolution — import bypass: write status directly, no transition service
      // Governance bypass: imports are bulk historical loads. Per-task gate checks are NOT
      // fired. Status is written at insert time bypassing assertStatusTransitionBucket().
      // This is a ruled exception (architect dispatch 2026-07-08). The gate logic in
      // WorkTasksService.updateTask() is bypassed intentionally for import rows.
      let resolvedStatus = defaultStatus;
      let statusDefaulted = false;
      if (mapping.status !== undefined) {
        const rawStatus = fields[mapping.status]?.trim();
        if (rawStatus) {
          const matched = statusLookup.get(rawStatus.toLowerCase());
          if (matched) {
            resolvedStatus = matched;
          } else {
            statusDefaulted = true;
          }
        }
      }

      // Assignee resolution
      let assigneeUserId: string | null = null;
      let assigneeNotFound = false;
      if (mapping.assigneeEmail !== undefined) {
        const email = fields[mapping.assigneeEmail]?.trim().toLowerCase();
        if (email) {
          const userId = memberByEmail.get(email);
          if (userId) {
            assigneeUserId = userId;
          } else {
            assigneeNotFound = true;
          }
        }
      }

      // Date parsing — ISO 8601 and YYYY-MM-DD only; anything else dropped
      let dueDate: Date | null = null;
      let dateUnparsed = false;
      if (mapping.dueDate !== undefined) {
        const raw = fields[mapping.dueDate]?.trim();
        if (raw) {
          if (ISO_DATE_RE.test(raw)) {
            const d = new Date(raw);
            if (isNaN(d.getTime())) {
              dateUnparsed = true;
            } else {
              dueDate = d;
            }
          } else {
            dateUnparsed = true;
          }
        }
      }

      // Priority resolution (best-effort, drop silently if unmapped/unrecognized)
      let priority: TaskPriority = TaskPriority.MEDIUM;
      if (mapping.priority !== undefined) {
        const raw = fields[mapping.priority]?.trim().toLowerCase();
        if (raw && PRIORITY_MAP[raw]) priority = PRIORITY_MAP[raw];
      }

      // Description
      let description: string | undefined;
      if (mapping.description !== undefined) {
        description = fields[mapping.description]?.trim() || undefined;
      }

      // Tags — single column interpreted as comma-separated list
      let tags: string[] | null = null;
      if (mapping.tags !== undefined) {
        const raw = fields[mapping.tags]?.trim();
        if (raw) tags = raw.split(',').map((t) => t.trim()).filter(Boolean);
      }

      const task: Partial<WorkTask> = {
        organizationId: auth.organizationId,
        workspaceId: auth.workspaceId,
        projectId: dto.projectId,
        title: titleRaw,
        description: description ?? null,
        status: resolvedStatus,
        priority,
        assigneeUserId,
        dueDate,
        tags,
        metadata: { importBatchId: batchId },
      };

      tasksToInsert.push(task);

      // Collect skip-reason notes (row still imported)
      if (statusDefaulted) skipped.push({ row: rowNum, reason: 'status_defaulted' });
      if (assigneeNotFound) skipped.push({ row: rowNum, reason: 'assignee_not_found' });
      if (dateUnparsed) skipped.push({ row: rowNum, reason: 'date_unparsed' });
    }

    const importable = tasksToInsert.length;
    let created = 0;

    if (!dto.dryRun && importable > 0) {
      // Batched inserts in 500-row chunks, each chunk in its own transaction
      const chunks = chunk(tasksToInsert, BATCH_SIZE);
      for (const ch of chunks) {
        await this.dataSource.transaction(async (manager) => {
          const repo = manager.getRepository(WorkTask);
          const entities = ch.map((t) => repo.create(t));
          await repo.save(entities);
        });
        created += ch.length;
      }
    }

    return {
      totalRows: dataLines.length,
      importable,
      skipped,
      created,
      batchId,
    };
  }
}

function resolveDefaultStatus(statuses: ProjectStatus[]): string {
  const def = statuses.find((s) => s.isDefault);
  return def?.statusKey ?? 'TODO';
}

function buildStatusLookup(statuses: ProjectStatus[]): Map<string, string> {
  const map = new Map<string, string>();
  // Legacy keys first
  for (const key of DEFAULT_STATUS_KEYS) {
    map.set(key.toLowerCase(), key);
  }
  // Project-specific statuses (statusKey and displayName, both case-insensitive)
  for (const s of statuses) {
    map.set(s.statusKey.toLowerCase(), s.statusKey);
    map.set(s.displayName.toLowerCase(), s.statusKey);
  }
  return map;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}
