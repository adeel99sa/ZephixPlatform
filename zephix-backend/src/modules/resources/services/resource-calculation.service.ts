import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';
import { Resource } from '../entities/resource.entity';

@Injectable()
export class ResourceCalculationService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
  ) {}

  async calculateResourceImpact(taskId: string): Promise<number> {
    // FIXME(task-entity-drift): this method is DEAD on multiple axes as of 2026-05-05.
    //
    // Drift columns read: `assignedResources`, `startDate`, `endDate` — all REMOVED
    // from canonical Task entity (src/modules/projects/entities/task.entity.ts) on
    // 2026-05-05. Drift origin: dead `add-task-resource-fields.sql` that the migration
    // runner never loaded.
    //
    // This file imports the ORPHAN Task entity (src/modules/tasks/entities/task.entity.ts),
    // which still declares these columns — but the underlying DB columns do not exist,
    // so any SELECT projecting them returns undefined and any WHERE filter against them
    // matches zero rows. In practice this method has been silently broken: returning 0
    // (the early-return branch) for every input.
    //
    // Dead-by-transitivity: ResourceCalculationService is only consumed by
    // `tasks.service.ts` (see imports), which is itself the legacy /tasks service.
    // `tasks.service.create()` and `tasks.service.update()` resource-impact blocks are
    // already FIXME'd as dead (LegacyTasksGuard returns 410 Gone on POST/PUT/PATCH/DELETE
    // /tasks).
    //
    // Honest broken behavior: returns 0. The real implementation depended on schema
    // fields that never existed in DB.
    //
    // Follow-up dispatch needed: replace ResourceCalculationService with a WorkTask-based
    // calculation OR delete the service entirely if /tasks API is fully retired.
    //
    // Tracked: docs/dispatches/TASK-ENTITY-DRIFT-EXECUTION-DISPATCH.md
    void taskId;
    return 0;
  }

  async calculateTotalResourceLoad(
    resourceName: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // FIXME(task-entity-drift): this method is DEAD as of 2026-05-05. Same reasons as
    // `calculateResourceImpact()` above:
    //   1. `assignedResources`, `startDate`, `endDate` are drifted columns removed from
    //      canonical Task entity. Orphan Task entity still declares them but DB columns
    //      do not exist — Between(startDate, endDate) filter matches zero rows.
    //   2. ResourceCalculationService is dead-by-transitivity (only consumer is
    //      already-dead tasks.service.ts).
    //   3. The split/filter logic over assignedResources never had a real backing column.
    //
    // Honest broken behavior: returns 0. The real implementation depended on schema
    // fields that never existed in DB.
    //
    // Follow-up dispatch needed: ResourceCalculationService deprecation OR rewrite via
    // WorkTask + proper assignment join.
    //
    // Tracked: docs/dispatches/TASK-ENTITY-DRIFT-EXECUTION-DISPATCH.md
    void resourceName;
    void startDate;
    void endDate;
    return 0;
  }

  private calculateWeeksBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays / 7, 1);
  }
}
