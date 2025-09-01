import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveRiskSignalsTable1756531477015 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "riskSignals" CASCADE`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_risk_signals_project"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_risk_signals_status"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Rollback would recreate table if needed
    }
}