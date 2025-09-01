import { MigrationInterface, QueryRunner } from "typeorm";

export class StandardizeTableNaming1756684672723 implements MigrationInterface {
    name = 'StandardizeTableNaming1756684672723'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rename all camelCase tables to snake_case
        
        // 1. emailVerifications -> email_verifications
        await queryRunner.query(`ALTER TABLE "emailVerifications" RENAME TO "email_verifications"`);
        
        // 2. refreshTokens -> refresh_tokens
        await queryRunner.query(`ALTER TABLE "refreshTokens" RENAME TO "refresh_tokens"`);
        
        // 3. riskSignals -> risk_signals
        await queryRunner.query(`ALTER TABLE "riskSignals" RENAME TO "risk_signals"`);
        
        // 4. userDailyCapacity -> user_daily_capacity
        await queryRunner.query(`ALTER TABLE "userDailyCapacity" RENAME TO "user_daily_capacity"`);
        
        // 5. userOrganizations -> user_organizations
        await queryRunner.query(`ALTER TABLE "userOrganizations" RENAME TO "user_organizations"`);
        
        // 6. workItems -> work_items
        await queryRunner.query(`ALTER TABLE "workItems" RENAME TO "work_items"`);
        
        // Note: project_allocations will be dropped by the consolidation migration
        // Note: resource_allocations is already snake_case
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse the renaming operations
        
        // 1. email_verifications -> emailVerifications
        await queryRunner.query(`ALTER TABLE "email_verifications" RENAME TO "emailVerifications"`);
        
        // 2. refresh_tokens -> refreshTokens
        await queryRunner.query(`ALTER TABLE "refresh_tokens" RENAME TO "refreshTokens"`);
        
        // 3. risk_signals -> riskSignals
        await queryRunner.query(`ALTER TABLE "risk_signals" RENAME TO "riskSignals"`);
        
        // 4. user_daily_capacity -> userDailyCapacity
        await queryRunner.query(`ALTER TABLE "user_daily_capacity" RENAME TO "userDailyCapacity"`);
        
        // 5. user_organizations -> userOrganizations
        await queryRunner.query(`ALTER TABLE "user_organizations" RENAME TO "userOrganizations"`);
        
        // 6. work_items -> workItems
        await queryRunner.query(`ALTER TABLE "work_items" RENAME TO "workItems"`);
    }
}
