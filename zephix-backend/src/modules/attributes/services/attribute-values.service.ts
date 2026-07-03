import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  AttributeDataType,
  AttributeDefinition,
} from '../entities/attribute-definition.entity';
import { AttributeValue } from '../entities/attribute-value.entity';

// Maps each data type to the single typed column it populates in attribute_values.
const DATA_TYPE_COLUMN: Record<
  AttributeDataType,
  keyof Pick<
    AttributeValue,
    | 'valueText'
    | 'valueNumber'
    | 'valueBoolean'
    | 'valueDate'
    | 'valueDatetime'
    | 'valueJson'
  >
> = {
  [AttributeDataType.TEXT]: 'valueText',
  [AttributeDataType.LONG_TEXT]: 'valueText',
  [AttributeDataType.URL]: 'valueText',
  [AttributeDataType.EMAIL]: 'valueText',
  [AttributeDataType.SINGLE_SELECT]: 'valueText',
  [AttributeDataType.FILE_REFERENCE]: 'valueText',
  [AttributeDataType.NUMBER]: 'valueNumber',
  [AttributeDataType.INTEGER]: 'valueNumber',
  [AttributeDataType.DECIMAL]: 'valueNumber',
  [AttributeDataType.CURRENCY]: 'valueNumber',
  [AttributeDataType.PERCENTAGE]: 'valueNumber',
  [AttributeDataType.RATING]: 'valueNumber',
  [AttributeDataType.DURATION]: 'valueNumber',
  [AttributeDataType.BOOLEAN]: 'valueBoolean',
  [AttributeDataType.DATE]: 'valueDate',
  [AttributeDataType.DATETIME]: 'valueDatetime',
  [AttributeDataType.MULTI_SELECT]: 'valueJson',
  [AttributeDataType.PEOPLE]: 'valueJson',
  [AttributeDataType.RELATIONSHIP]: 'valueJson',
  [AttributeDataType.COMPUTED]: 'valueJson',
};

@Injectable()
export class AttributeValuesService {
  constructor(
    @InjectRepository(AttributeDefinition)
    private readonly definitionsRepo: Repository<AttributeDefinition>,
    @InjectRepository(AttributeValue)
    private readonly valuesRepo: Repository<AttributeValue>,
  ) {}

  async findAllForTask(
    taskId: string,
    wsId: string,
    orgId: string,
  ): Promise<AttributeValue[]> {
    return this.valuesRepo.find({
      where: { workTaskId: taskId, workspaceId: wsId, organizationId: orgId },
    });
  }

  /**
   * Batch read: returns all attribute values for up to 200 tasks.
   * Capped at 200 to bound the IN clause; 400 above that.
   * Tenancy-scoped to wsId + orgId — no cross-workspace leakage.
   */
  async findAllForTasks(
    taskIds: string[],
    wsId: string,
    orgId: string,
  ): Promise<AttributeValue[]> {
    if (taskIds.length === 0) return [];
    if (taskIds.length > 200) {
      throw new BadRequestException({
        code: 'TOO_MANY_TASK_IDS',
        message: 'taskIds must contain 200 or fewer IDs',
        max: 200,
      });
    }
    return this.valuesRepo.find({
      where: {
        workTaskId: In(taskIds),
        workspaceId: wsId,
        organizationId: orgId,
      },
    });
  }

  /**
   * Idempotent upsert: one row per (work_task_id, attribute_definition_id).
   * Validates the JS type of value against the definition's dataType.
   * Wrong primitive → 400 ATTRIBUTE_TYPE_MISMATCH.
   * Cross-workspace or unknown definition → 404.
   *
   * Options-array membership validation is deferred to Wave 2.
   */
  async upsert(
    taskId: string,
    defId: string,
    value: unknown,
    wsId: string,
    orgId: string,
  ): Promise<AttributeValue> {
    const def = await this.resolveDefinition(defId, wsId, orgId);
    const typedColumns = this.buildValueColumns(def.dataType, value);

    await this.valuesRepo.upsert(
      {
        workTaskId: taskId,
        attributeDefinitionId: defId,
        organizationId: orgId,
        workspaceId: wsId,
        ...typedColumns,
      },
      { conflictPaths: ['workTaskId', 'attributeDefinitionId'] },
    );

    return this.valuesRepo.findOne({
      where: { workTaskId: taskId, attributeDefinitionId: defId },
    });
  }

  async delete(
    taskId: string,
    defId: string,
    wsId: string,
    orgId: string,
  ): Promise<void> {
    const row = await this.valuesRepo.findOne({
      where: {
        workTaskId: taskId,
        attributeDefinitionId: defId,
        workspaceId: wsId,
        organizationId: orgId,
      },
    });
    if (!row) throw new NotFoundException({ code: 'NOT_FOUND' });
    await this.valuesRepo.remove(row);
  }

  // ── Value coercion / type-checking ───────────────────────────────────────

  /**
   * Maps the incoming value to exactly one typed column; nulls all others.
   * Throws 400 ATTRIBUTE_TYPE_MISMATCH if the JS type doesn't match.
   */
  buildValueColumns(
    dataType: AttributeDataType,
    value: unknown,
  ): {
    valueText: string | null;
    valueNumber: number | null;
    valueBoolean: boolean | null;
    valueDate: string | null;
    valueDatetime: Date | null;
    valueJson: Record<string, unknown> | null;
  } {
    const base = {
      valueText: null as string | null,
      valueNumber: null as number | null,
      valueBoolean: null as boolean | null,
      valueDate: null as string | null,
      valueDatetime: null as Date | null,
      valueJson: null as Record<string, unknown> | null,
    };

    const col = DATA_TYPE_COLUMN[dataType];

    switch (col) {
      case 'valueText':
        if (typeof value !== 'string') this.throwMismatch(dataType);
        base.valueText = value as string;
        break;

      case 'valueNumber':
        if (typeof value !== 'number' || !isFinite(value as number))
          this.throwMismatch(dataType);
        base.valueNumber = value as number;
        break;

      case 'valueBoolean':
        if (typeof value !== 'boolean') this.throwMismatch(dataType);
        base.valueBoolean = value as boolean;
        break;

      case 'valueDate':
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value as string))
          this.throwMismatch(dataType);
        base.valueDate = value as string;
        break;

      case 'valueDatetime':
        if (typeof value !== 'string' || isNaN(Date.parse(value as string)))
          this.throwMismatch(dataType);
        base.valueDatetime = new Date(value as string);
        break;

      case 'valueJson':
        if (typeof value !== 'object' || value === null) this.throwMismatch(dataType);
        base.valueJson = value as Record<string, unknown>;
        break;
    }

    return base;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async resolveDefinition(
    defId: string,
    wsId: string,
    orgId: string,
  ): Promise<AttributeDefinition> {
    const def = await this.definitionsRepo.findOne({ where: { id: defId } });
    if (!def) throw new NotFoundException({ code: 'NOT_FOUND' });

    // Cross-tenant isolation: definition must be within this org/workspace.
    const tenancyOk =
      (def.organizationId === null) || // SYSTEM scope — always reachable
      (def.organizationId === orgId &&
        (def.workspaceId === null || def.workspaceId === wsId));

    if (!tenancyOk) throw new NotFoundException({ code: 'NOT_FOUND' });
    return def;
  }

  private throwMismatch(dataType: AttributeDataType): never {
    throw new BadRequestException({
      code: 'ATTRIBUTE_TYPE_MISMATCH',
      dataType,
    });
  }
}
