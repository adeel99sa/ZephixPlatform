import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateRiskManagementTables004 implements MigrationInterface {
  name = 'CreateRiskManagementTables004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create risks table
    await queryRunner.createTable(
      new Table({
        name: 'risks',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'projectId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'subcategory',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'probability',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'impact',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'riskScore',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'riskLevel',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'timing',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'triggers',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'dependencies',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'source',
            type: 'varchar',
            length: '30',
            isNullable: false,
          },
          {
            name: 'confidence',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'statusNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'riskData',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdBy',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'lastUpdatedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Create risk_assessments table
    await queryRunner.createTable(
      new Table({
        name: 'risk_assessments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'riskId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'assessmentDate',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'probabilityScore',
            type: 'decimal',
            precision: 3,
            scale: 1,
            isNullable: false,
          },
          {
            name: 'probabilityConfidence',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'probabilityRationale',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'impactScores',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'riskScore',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'riskLevel',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'quantifiedImpact',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'assessmentNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'evidencePoints',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'assessmentData',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'assessedBy',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Create risk_responses table
    await queryRunner.createTable(
      new Table({
        name: 'risk_responses',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'riskId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'strategy',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'rationale',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'actions',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'contingencyPlan',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'transferDetails',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'monitoring',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'effectiveness',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'responseData',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdBy',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'lastUpdatedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Create risk_monitoring table
    await queryRunner.createTable(
      new Table({
        name: 'risk_monitoring',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'riskId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'monitoringDate',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'monitoringFrequency',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'kpis',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'thresholds',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'assignedTo',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'monitoringMethods',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'reportingStructure',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'monitoringNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'monitoringData',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdBy',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'lastUpdatedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Create indexes
    await queryRunner.createIndex('risks', {
      name: 'IDX_risks_projectId_riskScore',
      columnNames: ['projectId', 'riskScore'],
    });

    await queryRunner.createIndex('risks', {
      name: 'IDX_risks_projectId_riskLevel',
      columnNames: ['projectId', 'riskLevel'],
    });

    await queryRunner.createIndex('risk_assessments', {
      name: 'IDX_risk_assessments_riskId_assessmentDate',
      columnNames: ['riskId', 'assessmentDate'],
    });

    await queryRunner.createIndex('risk_responses', {
      name: 'IDX_risk_responses_riskId_strategy',
      columnNames: ['riskId', 'strategy'],
    });

    await queryRunner.createIndex('risk_monitoring', {
      name: 'IDX_risk_monitoring_riskId_monitoringDate',
      columnNames: ['riskId', 'monitoringDate'],
    });

    // Create foreign keys
    await queryRunner.createForeignKey(
      'risks',
      new TableForeignKey({
        columnNames: ['projectId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'projects',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'risk_assessments',
      new TableForeignKey({
        columnNames: ['riskId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'risks',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'risk_responses',
      new TableForeignKey({
        columnNames: ['riskId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'risks',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'risk_monitoring',
      new TableForeignKey({
        columnNames: ['riskId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'risks',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const risksTable = await queryRunner.getTable('risks');
    const riskAssessmentsTable = await queryRunner.getTable('risk_assessments');
    const riskResponsesTable = await queryRunner.getTable('risk_responses');
    const riskMonitoringTable = await queryRunner.getTable('risk_monitoring');

    if (risksTable) {
      const foreignKey = risksTable.foreignKeys.find(fk => fk.columnNames.indexOf('projectId') !== -1);
      if (foreignKey) {
        await queryRunner.dropForeignKey('risks', foreignKey);
      }
    }

    if (riskAssessmentsTable) {
      const foreignKey = riskAssessmentsTable.foreignKeys.find(fk => fk.columnNames.indexOf('riskId') !== -1);
      if (foreignKey) {
        await queryRunner.dropForeignKey('risk_assessments', foreignKey);
      }
    }

    if (riskResponsesTable) {
      const foreignKey = riskResponsesTable.foreignKeys.find(fk => fk.columnNames.indexOf('riskId') !== -1);
      if (foreignKey) {
        await queryRunner.dropForeignKey('risk_responses', foreignKey);
      }
    }

    if (riskMonitoringTable) {
      const foreignKey = riskMonitoringTable.foreignKeys.find(fk => fk.columnNames.indexOf('riskId') !== -1);
      if (foreignKey) {
        await queryRunner.dropForeignKey('risk_monitoring', foreignKey);
      }
    }

    // Drop tables
    await queryRunner.dropTable('risk_monitoring');
    await queryRunner.dropTable('risk_responses');
    await queryRunner.dropTable('risk_assessments');
    await queryRunner.dropTable('risks');
  }
}
