import { Injectable } from '@nestjs/common';
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from 'typeorm';
import { TenantContextService } from './tenant-context.service';

/**
 * TypeORM subscriber that manages the SKIP_TENANT_GUARDRAIL_DEPTH counter
 * in AsyncLocalStorage during persistence operations.
 *
 * WHY THIS EXISTS:
 * TypeORM's persistence internals (SubjectDatabaseEntityLoader, EntityPersistExecutor,
 * RelationLoader) call Repository.createQueryBuilder internally during save/update/delete.
 * The runtime guardrail patches Repository.prototype.createQueryBuilder to detect tenant
 * scoping bypasses. Without this subscriber, those internal calls would trigger false
 * positive bypass errors.
 *
 * HOW IT WORKS:
 * - beforeInsert/Update/Remove: increment depth counter (signals "inside persistence op")
 * - afterInsert/Update/Remove: decrement depth counter (signals "persistence op complete")
 * - The guardrail checks: if depth > 0, skip assertion (TypeORM internal call)
 * - Reference-counted (not boolean) to handle nested/cascade persistence correctly
 *
 * ERROR PATH:
 * TypeORM does NOT guarantee afterX fires if the DB operation fails. If depth stays
 * elevated after an error, the guardrail remains "off" for the rest of that ALS context
 * (request). This is acceptable: the guardrail is dev/test only, and ALS context is
 * garbage collected when the request ends.
 */
@Injectable()
export class TenantPersistenceGuardrailSubscriber
  implements EntitySubscriberInterface
{
  constructor(
    dataSource: DataSource,
    private readonly tenantContextService: TenantContextService,
  ) {
    // Self-register with TypeORM DataSource (CONSTRAINT 6 — TypeORM registration)
    dataSource.subscribers.push(this);
  }

  // No listenTo() — listen to ALL entities

  beforeInsert(_event: InsertEvent<any>): void {
    this.tenantContextService.incrementSkipTenantGuardrailDepth();
  }

  afterInsert(_event: InsertEvent<any>): void {
    this.tenantContextService.decrementSkipTenantGuardrailDepth();
  }

  beforeUpdate(_event: UpdateEvent<any>): void {
    this.tenantContextService.incrementSkipTenantGuardrailDepth();
  }

  afterUpdate(_event: UpdateEvent<any>): void {
    this.tenantContextService.decrementSkipTenantGuardrailDepth();
  }

  beforeRemove(_event: RemoveEvent<any>): void {
    this.tenantContextService.incrementSkipTenantGuardrailDepth();
  }

  afterRemove(_event: RemoveEvent<any>): void {
    this.tenantContextService.decrementSkipTenantGuardrailDepth();
  }
}
