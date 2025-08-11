import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { StatusReport } from '../src/pm/entities/status-report.entity';
import { Project } from '../src/projects/entities/project.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { User } from '../src/users/entities/user.entity';
import { Team } from '../src/projects/entities/team.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import { TeamMember } from '../src/projects/entities/team-member.entity';
import { Role } from '../src/projects/entities/role.entity';

// Load environment variables
config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'zephix_user',
  password: process.env.DB_PASSWORD || 'zephix_secure_password_2024',
  database: process.env.DB_DATABASE || 'zephix_auth_db',
  ssl: false,
  entities: [StatusReport, Project, Organization, User, Team, UserOrganization, TeamMember, Role],
});

interface RelationshipConflict {
  entity: string;
  property: string;
  expectedType: string;
  actualType: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

interface ColumnMismatch {
  table: string;
  column: string;
  entityProperty: string;
  expectedType: string;
  actualType: string;
  issue: string;
}

async function auditEntityRelationships() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    const conflicts: RelationshipConflict[] = [];
    const columnMismatches: ColumnMismatch[] = [];

    console.log('\n🔍 AUDITING ENTITY RELATIONSHIPS...\n');

    // 1. Audit StatusReport entity
    console.log('📊 Auditing StatusReport entity...');
    await auditStatusReportEntity(conflicts, columnMismatches);

    // 2. Audit Project entity
    console.log('\n📊 Auditing Project entity...');
    await auditProjectEntity(conflicts, columnMismatches);

    // 3. Audit Organization entity
    console.log('\n📊 Auditing Organization entity...');
    await auditOrganizationEntity(conflicts, columnMismatches);

    // 4. Audit User entity
    console.log('\n📊 Auditing User entity...');
    await auditUserEntity(conflicts, columnMismatches);

    // 5. Audit Team entity
    console.log('\n📊 Auditing Team entity...');
    await auditTeamEntity(conflicts, columnMismatches);

    // 6. Generate comprehensive report
    console.log('\n📋 COMPREHENSIVE AUDIT REPORT');
    console.log('=' .repeat(50));

    if (conflicts.length === 0 && columnMismatches.length === 0) {
      console.log('🎉 No relationship conflicts or column mismatches found!');
    } else {
      if (conflicts.length > 0) {
        console.log(`\n🔴 RELATIONSHIP CONFLICTS (${conflicts.length}):`);
        conflicts.forEach((conflict, index) => {
          console.log(`\n${index + 1}. ${conflict.entity}.${conflict.property}`);
          console.log(`   Severity: ${conflict.severity}`);
          console.log(`   Expected: ${conflict.expectedType}`);
          console.log(`   Actual: ${conflict.actualType}`);
          console.log(`   Issue: ${conflict.description}`);
        });
      }

      if (columnMismatches.length > 0) {
        console.log(`\n🟡 COLUMN MISMATCHES (${columnMismatches.length}):`);
        columnMismatches.forEach((mismatch, index) => {
          console.log(`\n${index + 1}. Table: ${mismatch.table}`);
          console.log(`   Column: ${mismatch.column}`);
          console.log(`   Entity Property: ${mismatch.entityProperty}`);
          console.log(`   Expected Type: ${mismatch.expectedType}`);
          console.log(`   Actual Type: ${mismatch.actualType}`);
          console.log(`   Issue: ${mismatch.issue}`);
        });
      }

      // 7. Generate fix recommendations
      console.log('\n🔧 RECOMMENDED FIXES:');
      console.log('=' .repeat(50));
      
      if (conflicts.length > 0) {
        console.log('\n1. Run the FixStatusReportingRelationships migration');
        console.log('2. Update entity decorators to match database schema');
        console.log('3. Ensure all @JoinColumn names match database column names');
      }

      if (columnMismatches.length > 0) {
        console.log('\n4. Create migrations to align column types');
        console.log('5. Update entity column decorators');
        console.log('6. Test all CRUD operations after fixes');
      }
    }

  } catch (error) {
    console.error('❌ Entity relationship audit failed:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

async function auditStatusReportEntity(conflicts: RelationshipConflict[], columnMismatches: ColumnMismatch[]) {
  const metadata = AppDataSource.getMetadata(StatusReport);
  const tableName = metadata.tableName;

  // Check if table exists
  const tableExists = await AppDataSource.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = $1
    )
  `, [tableName]);

  if (!tableExists[0].exists) {
    conflicts.push({
      entity: 'StatusReport',
      property: 'table',
      expectedType: 'exists',
      actualType: 'missing',
      severity: 'HIGH',
      description: 'Table does not exist in database'
    });
    return;
  }

  // Check columns
  const columns = await AppDataSource.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position
  `, [tableName]);

  // Check required columns from entity
  const requiredColumns = [
    'id', 'projectId', 'organizationId', 'reportingPeriodStart', 
    'reportingPeriodEnd', 'overallStatus', 'healthScore', 
    'stakeholderAudience', 'reportFormat', 'reportData'
  ];

  for (const requiredCol of requiredColumns) {
    const dbColumn = columns.find((col: any) => col.column_name === requiredCol);
    if (!dbColumn) {
      columnMismatches.push({
        table: tableName,
        column: requiredCol,
        entityProperty: requiredCol,
        expectedType: 'exists',
        actualType: 'missing',
        issue: 'Required column missing from database'
      });
    }
  }

  // Check foreign key relationships
  const foreignKeys = await AppDataSource.query(`
    SELECT 
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = $1
  `, [tableName]);

  // Check project relationship
  const projectFK = foreignKeys.find((fk: any) => fk.column_name === 'projectId');
  if (!projectFK || projectFK.foreign_table_name !== 'projects') {
    conflicts.push({
      entity: 'StatusReport',
      property: 'project',
      expectedType: 'FK to projects.id',
      actualType: projectFK ? `FK to ${projectFK.foreign_table_name}.${projectFK.foreign_column_name}` : 'missing',
      severity: 'HIGH',
      description: 'Project foreign key relationship missing or incorrect'
    });
  }

  // Check organization relationship
  const orgFK = foreignKeys.find((fk: any) => fk.column_name === 'organizationId');
  if (!orgFK || orgFK.foreign_table_name !== 'organizations') {
    conflicts.push({
      entity: 'StatusReport',
      property: 'organization',
      expectedType: 'FK to organizations.id',
      actualType: orgFK ? `FK to ${orgFK.foreign_table_name}.${orgFK.foreign_column_name}` : 'missing',
      severity: 'HIGH',
      description: 'Organization foreign key relationship missing or incorrect'
    });
  }
}

async function auditProjectEntity(conflicts: RelationshipConflict[], columnMismatches: ColumnMismatch[]) {
  const metadata = AppDataSource.getMetadata(Project);
  const tableName = metadata.tableName;

  // Check if table exists
  const tableExists = await AppDataSource.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = $1
    )
  `, [tableName]);

  if (!tableExists[0].exists) {
    conflicts.push({
      entity: 'Project',
      property: 'table',
      expectedType: 'exists',
      actualType: 'missing',
      severity: 'HIGH',
      description: 'Table does not exist in database'
    });
    return;
  }

  // Check columns
  const columns = await AppDataSource.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position
  `, [tableName]);

  // Check required columns from entity
  const requiredColumns = [
    'id', 'name', 'description', 'status', 'priority', 'startDate', 
    'endDate', 'estimatedEndDate', 'organizationId', 'projectManagerId',
    'budget', 'actualCost', 'riskLevel', 'createdById'
  ];

  for (const requiredCol of requiredColumns) {
    const dbColumn = columns.find((col: any) => col.column_name === requiredCol);
    if (!dbColumn) {
      columnMismatches.push({
        table: tableName,
        column: requiredCol,
        entityProperty: requiredCol,
        expectedType: 'exists',
        actualType: 'missing',
        issue: 'Required column missing from database'
      });
    }
  }

  // Check foreign key relationships
  const foreignKeys = await AppDataSource.query(`
    SELECT 
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = $1
  `, [tableName]);

  // Check createdBy relationship
  const createdByFK = foreignKeys.find((fk: any) => fk.column_name === 'createdById');
  if (!createdByFK || createdByFK.foreign_table_name !== 'users') {
    conflicts.push({
      entity: 'Project',
      property: 'createdBy',
      expectedType: 'FK to users.id',
      actualType: createdByFK ? `FK to ${createdByFK.foreign_table_name}.${createdByFK.foreign_column_name}` : 'missing',
      severity: 'MEDIUM',
      description: 'CreatedBy foreign key relationship missing or incorrect'
    });
  }
}

async function auditOrganizationEntity(conflicts: RelationshipConflict[], columnMismatches: ColumnMismatch[]) {
  const metadata = AppDataSource.getMetadata(Organization);
  const tableName = metadata.tableName;

  // Check if table exists
  const tableExists = await AppDataSource.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = $1
    )
  `, [tableName]);

  if (!tableExists[0].exists) {
    conflicts.push({
      entity: 'Organization',
      property: 'table',
      expectedType: 'exists',
      actualType: 'missing',
      severity: 'HIGH',
      description: 'Table does not exist in database'
    });
    return;
  }

  // Check columns
  const columns = await AppDataSource.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position
  `, [tableName]);

  // Check required columns from entity
  const requiredColumns = [
    'id', 'name', 'slug', 'settings', 'status', 'trialEndsAt', 
    'description', 'website', 'industry', 'size'
  ];

  for (const requiredCol of requiredColumns) {
    const dbColumn = columns.find((col: any) => col.column_name === requiredCol);
    if (!dbColumn) {
      columnMismatches.push({
        table: tableName,
        column: requiredCol,
        entityProperty: requiredCol,
        expectedType: 'exists',
        actualType: 'missing',
        issue: 'Required column missing from database'
      });
    }
  }
}

async function auditUserEntity(conflicts: RelationshipConflict[], columnMismatches: ColumnMismatch[]) {
  const metadata = AppDataSource.getMetadata(User);
  const tableName = metadata.tableName;

  // Check if table exists
  const tableExists = await AppDataSource.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = $1
    )
  `, [tableName]);

  if (!tableExists[0].exists) {
    conflicts.push({
      entity: 'User',
      property: 'table',
      expectedType: 'exists',
      actualType: 'missing',
      severity: 'HIGH',
      description: 'Table does not exist in database'
    });
    return;
  }

  // Check columns
  const columns = await AppDataSource.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position
  `, [tableName]);

  // Check required columns from entity
  const requiredColumns = [
    'id', 'email', 'password', 'firstName', 'lastName', 
    'isActive', 'isEmailVerified', 'emailVerifiedAt'
  ];

  for (const requiredCol of requiredColumns) {
    const dbColumn = columns.find((col: any) => col.column_name === requiredCol);
    if (!dbColumn) {
      columnMismatches.push({
        table: tableName,
        column: requiredCol,
        entityProperty: requiredCol,
        expectedType: 'exists',
        actualType: 'missing',
        issue: 'Required column missing from database'
      });
    }
  }
}

async function auditTeamEntity(conflicts: RelationshipConflict[], columnMismatches: ColumnMismatch[]) {
  const metadata = AppDataSource.getMetadata(Team);
  const tableName = metadata.tableName;

  // Check if table exists
  const tableExists = await AppDataSource.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = $1
    )
  `, [tableName]);

  if (!tableExists[0].exists) {
    conflicts.push({
      entity: 'Team',
      property: 'table',
      expectedType: 'exists',
      actualType: 'missing',
      severity: 'HIGH',
      description: 'Table does not exist in database'
    });
    return;
  }

  // Check columns
  const columns = await AppDataSource.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position
  `, [tableName]);

  // Check required columns from entity
  const requiredColumns = [
    'id', 'name', 'description', 'projectId', 'organizationId'
  ];

  for (const requiredCol of requiredColumns) {
    const dbColumn = columns.find((col: any) => col.column_name === requiredCol);
    if (!dbColumn) {
      columnMismatches.push({
        table: tableName,
        column: requiredCol,
        entityProperty: requiredCol,
        expectedType: 'exists',
        actualType: 'missing',
        issue: 'Required column missing from database'
      });
    }
  }

  // Check foreign key relationships
  const foreignKeys = await AppDataSource.query(`
    SELECT 
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = $1
  `, [tableName]);

  // Check project relationship
  const projectFK = foreignKeys.find((fk: any) => fk.column_name === 'projectId');
  if (!projectFK || projectFK.foreign_table_name !== 'projects') {
    conflicts.push({
      entity: 'Team',
      property: 'project',
      expectedType: 'FK to projects.id',
      actualType: projectFK ? `FK to ${projectFK.foreign_table_name}.${projectFK.foreign_column_name}` : 'missing',
      severity: 'HIGH',
      description: 'Project foreign key relationship missing or incorrect'
    });
  }

  // Check organization relationship
  const orgFK = foreignKeys.find((fk: any) => fk.column_name === 'organizationId');
  if (!orgFK || orgFK.foreign_table_name !== 'organizations') {
    conflicts.push({
      entity: 'Team',
      property: 'organization',
      expectedType: 'FK to organizations.id',
      actualType: orgFK ? `FK to ${orgFK.foreign_table_name}.${orgFK.foreign_column_name}` : 'missing',
      severity: 'HIGH',
      description: 'Organization foreign key relationship missing or incorrect'
    });
  }
}

// Run the audit
auditEntityRelationships().catch(console.error);
