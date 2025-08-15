#!/usr/bin/env ts-node

/**
 * Migration Order Verification Script
 * Verifies that migrations are in the correct execution order
 * and checks for dependency conflicts
 */

import { DataSource } from 'typeorm';
import dataSourceOptions from '../src/data-source';

interface MigrationInfo {
  timestamp: number;
  name: string;
  path: string;
  dependencies: string[];
}

interface VerificationResult {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
  migrationOrder: MigrationInfo[];
}

class MigrationOrderVerifier {
  private dataSource: DataSource;

  constructor() {
    this.dataSource = new DataSource(dataSourceOptions);
  }

  /**
   * Main verification process
   */
  async verify(): Promise<VerificationResult> {
    try {
      console.log('🔍 Verifying migration execution order...');
      
      // Initialize data source
      await this.dataSource.initialize();
      console.log('✅ Database connection established');
      
      // Get all available migrations
      const migrations = this.dataSource.migrations || [];
      console.log(`📋 Found ${migrations.length} migration(s)`);
      
      if (migrations.length === 0) {
        return {
          isValid: true,
          issues: [],
          recommendations: ['No migrations found'],
          migrationOrder: []
        };
      }
      
      // Analyze migrations
      const migrationInfos = await this.analyzeMigrations(migrations);
      
      // Check execution order
      const orderIssues = this.checkExecutionOrder(migrationInfos);
      
      // Check dependencies
      const dependencyIssues = this.checkDependencies(migrationInfos);
      
      // Check for duplicate timestamps
      const duplicateIssues = this.checkDuplicateTimestamps(migrationInfos);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(migrationInfos, orderIssues, dependencyIssues, duplicateIssues);
      
      const allIssues = [...orderIssues, ...dependencyIssues, ...duplicateIssues];
      const isValid = allIssues.length === 0;
      
      const result: VerificationResult = {
        isValid,
        issues: allIssues,
        recommendations,
        migrationOrder: migrationInfos
      };
      
      // Display results
      this.displayResults(result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Verification failed:', error);
      throw error;
    } finally {
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
      }
    }
  }

  /**
   * Analyze migrations and extract information
   */
  private async analyzeMigrations(migrations: any[]): Promise<MigrationInfo[]> {
    const migrationInfos: MigrationInfo[] = [];
    
    for (const migration of migrations) {
      try {
        // Extract migration content to analyze dependencies
        const content = await this.getMigrationContent(migration);
        const dependencies = this.extractDependencies(content);
        
        migrationInfos.push({
          timestamp: migration.timestamp,
          name: migration.name,
          path: migration.path || 'unknown',
          dependencies
        });
      } catch (error) {
        console.warn(`⚠️  Could not analyze migration ${migration.name}:`, error.message);
        
        migrationInfos.push({
          timestamp: migration.timestamp,
          name: migration.name,
          path: migration.path || 'unknown',
          dependencies: []
        });
      }
    }
    
    // Sort by timestamp
    return migrationInfos.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get migration content for analysis
   */
  private async getMigrationContent(migration: any): Promise<string> {
    try {
      // Try to get the actual file content
      if (migration.path && require('fs').existsSync(migration.path)) {
        return require('fs').readFileSync(migration.path, 'utf-8');
      }
      
      // Fallback to migration name analysis
      return migration.name || '';
    } catch {
      return migration.name || '';
    }
  }

  /**
   * Extract dependencies from migration content
   */
  private extractDependencies(content: string): string[] {
    const dependencies: string[] = [];
    
    // Look for table references
    const tableRefs = content.match(/CREATE TABLE "?(\w+)"?/g);
    if (tableRefs) {
      tableRefs.forEach(ref => {
        const tableName = ref.replace(/CREATE TABLE "?(\w+)"?/, '$1');
        if (tableName !== 'migrations') {
          dependencies.push(tableName);
        }
      });
    }
    
    // Look for foreign key references
    const fkRefs = content.match(/REFERENCES "?(\w+)"?/g);
    if (fkRefs) {
      fkRefs.forEach(ref => {
        const tableName = ref.replace(/REFERENCES "?(\w+)"?/, '$1');
        if (tableName !== 'migrations') {
          dependencies.push(tableName);
        }
      });
    }
    
    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Check execution order for issues
   */
  private checkExecutionOrder(migrationInfos: MigrationInfo[]): string[] {
    const issues: string[] = [];
    
    for (let i = 1; i < migrationInfos.length; i++) {
      const current = migrationInfos[i];
      const previous = migrationInfos[i - 1];
      
      if (current.timestamp < previous.timestamp) {
        issues.push(
          `Migration order violation: ${current.name} (${current.timestamp}) should run before ${previous.name} (${previous.timestamp})`
        );
      }
    }
    
    return issues;
  }

  /**
   * Check for dependency conflicts
   */
  private checkDependencies(migrationInfos: MigrationInfo[]): string[] {
    const issues: string[] = [];
    
    for (let i = 0; i < migrationInfos.length; i++) {
      const migration = migrationInfos[i];
      
      // Check if dependencies are created before this migration
      for (const dependency of migration.dependencies) {
        const dependencyCreated = migrationInfos
          .slice(0, i)
          .some(m => m.dependencies.includes(dependency) || m.name.toLowerCase().includes(dependency.toLowerCase()));
        
        if (!dependencyCreated) {
          issues.push(
            `Dependency issue: ${migration.name} depends on '${dependency}' but it's not created before this migration`
          );
        }
      }
    }
    
    return issues;
  }

  /**
   * Check for duplicate timestamps
   */
  private checkDuplicateTimestamps(migrationInfos: MigrationInfo[]): string[] {
    const issues: string[] = [];
    const timestampCounts = new Map<number, string[]>();
    
    for (const migration of migrationInfos) {
      if (!timestampCounts.has(migration.timestamp)) {
        timestampCounts.set(migration.timestamp, []);
      }
      timestampCounts.get(migration.timestamp)!.push(migration.name);
    }
    
    for (const [timestamp, names] of timestampCounts) {
      if (names.length > 1) {
        issues.push(
          `Duplicate timestamp ${timestamp}: ${names.join(', ')}`
        );
      }
    }
    
    return issues;
  }

  /**
   * Generate recommendations for fixing issues
   */
  private generateRecommendations(
    migrationInfos: MigrationInfo[],
    orderIssues: string[],
    dependencyIssues: string[],
    duplicateIssues: string[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (orderIssues.length > 0) {
      recommendations.push(
        'Fix migration order by ensuring timestamps are in ascending order',
        'Use the consolidation script to reorder migrations properly'
      );
    }
    
    if (dependencyIssues.length > 0) {
      recommendations.push(
        'Ensure tables are created before they are referenced by foreign keys',
        'Move foundation table creation (organizations, users, roles) to early migrations',
        'Use the consolidated migration approach for proper dependency ordering'
      );
    }
    
    if (duplicateIssues.length > 0) {
      recommendations.push(
        'Fix duplicate timestamps by updating migration timestamps',
        'Use unique timestamps for each migration',
        'Consider using the consolidation script to resolve conflicts'
      );
    }
    
    if (recommendations.length === 0) {
      recommendations.push(
        'Migration order is correct - no issues found',
        'Consider running the consolidation script for better organization'
      );
    }
    
    return recommendations;
  }

  /**
   * Display verification results
   */
  private displayResults(result: VerificationResult): void {
    console.log('\n📊 Migration Verification Results');
    console.log('================================');
    
    if (result.isValid) {
      console.log('✅ All migrations are in correct order');
    } else {
      console.log('❌ Migration order issues found:');
      result.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }
    
    console.log('\n📋 Migration Execution Order:');
    result.migrationOrder.forEach((migration, index) => {
      console.log(`   ${index + 1}. ${migration.timestamp} - ${migration.name}`);
      if (migration.dependencies.length > 0) {
        console.log(`      Dependencies: ${migration.dependencies.join(', ')}`);
      }
    });
    
    if (result.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      result.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }
    
    console.log('\n🔧 Next Steps:');
    if (result.isValid) {
      console.log('   - Migrations are ready for execution');
      console.log('   - Run: npm run migration:run:consolidated');
    } else {
      console.log('   - Fix migration order issues first');
      console.log('   - Run consolidation script: ./scripts/execute-migration-consolidation.sh');
      console.log('   - Then run: npm run migration:run:consolidated');
    }
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new MigrationOrderVerifier();
  verifier.verify()
    .then(result => {
      process.exit(result.isValid ? 0 : 1);
    })
    .catch(error => {
      console.error('Verification failed:', error);
      process.exit(1);
    });
}


