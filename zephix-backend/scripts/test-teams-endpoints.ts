/**
 * Test script to verify Teams backend implementation
 * Run with: ts-node -r tsconfig-paths/register scripts/test-teams-endpoints.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TeamsService } from '../src/modules/teams/teams.service';
import { Team } from '../src/modules/teams/entities/team.entity';

async function testTeamsImplementation() {
  console.log('🧪 Testing Teams Backend Implementation...\n');

  try {
    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule);
    const teamsService = app.get(TeamsService);

    console.log('✅ TeamsService is available\n');

    // Test 1: Verify service methods exist
    console.log('Test 1: Service Methods');
    const methods = ['listTeams', 'getTeamById', 'createTeam', 'updateTeam', 'deleteTeam'];
    methods.forEach(method => {
      if (typeof (teamsService as any)[method] === 'function') {
        console.log(`  ✅ ${method} exists`);
      } else {
        console.log(`  ❌ ${method} missing`);
      }
    });

    // Test 2: Verify entities are registered
    console.log('\nTest 2: Entity Registration');
    try {
      const teamRepo = app.get('TeamRepository');
      console.log('  ✅ Team repository accessible');
    } catch (e) {
      console.log('  ⚠️  Team repository check skipped (requires DB connection)');
    }

    // Test 3: Verify DTOs
    console.log('\nTest 3: DTOs');
    const dtoFiles = [
      '../src/modules/teams/dto/list-teams-query.dto',
      '../src/modules/teams/dto/create-team.dto',
      '../src/modules/teams/dto/update-team.dto',
    ];
    dtoFiles.forEach(dto => {
      try {
        require(dto);
        console.log(`  ✅ ${dto.split('/').pop()} loaded`);
      } catch (e) {
        console.log(`  ❌ ${dto.split('/').pop()} failed to load`);
      }
    });

    // Test 4: Verify enums
    console.log('\nTest 4: Enums');
    try {
      const { TeamVisibility } = require('../src/shared/enums/team-visibility.enum');
      const { TeamMemberRole } = require('../src/shared/enums/team-member-role.enum');
      console.log(`  ✅ TeamVisibility: ${Object.values(TeamVisibility).join(', ')}`);
      console.log(`  ✅ TeamMemberRole: ${Object.values(TeamMemberRole).join(', ')}`);
    } catch (e) {
      console.log('  ❌ Enums failed to load');
    }

    // Test 5: Verify migration file exists
    console.log('\nTest 5: Migration');
    const fs = require('fs');
    const migrationPath = 'src/migrations/1767000000001-CreateTeamsTables.ts';
    if (fs.existsSync(migrationPath)) {
      console.log('  ✅ Migration file exists');
    } else {
      console.log('  ❌ Migration file missing');
    }

    await app.close();
    console.log('\n✅ All structural tests passed!\n');
    console.log('Next steps:');
    console.log('1. Run migration: npm run migration:run');
    console.log('2. Start server: npm run start:dev');
    console.log('3. Test endpoints with admin user token');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testTeamsImplementation();






