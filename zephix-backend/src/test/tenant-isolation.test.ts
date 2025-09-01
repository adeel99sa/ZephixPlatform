import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

describe('Tenant Isolation', () => {
  let dataSource: DataSource;
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({}).compile();
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should isolate tenant data', async () => {
    // Set tenant context
    await dataSource.query('SET LOCAL app.current_org_id = $1', ['org-1']);
    
    // Query should only return org-1 data
    const projects = await dataSource.query('SELECT * FROM projects');
    
    // All projects should belong to org-1
    projects.forEach(project => {
      expect(project.organization_id).toBe('org-1');
    });
  });

  it('should prevent cross-tenant access', async () => {
    // Set tenant context for org-1
    await dataSource.query('SET LOCAL app.current_org_id = $1', ['org-1']);
    
    // Try to access org-2 data directly
    const result = await dataSource.query(
      'SELECT * FROM projects WHERE organization_id = $1', 
      ['org-2']
    );
    
    // Should return empty result due to RLS
    expect(result.length).toBe(0);
  });
});

