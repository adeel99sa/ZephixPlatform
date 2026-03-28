import { PortfolioKpiSnapshotEntity } from '../entities/portfolio-kpi-snapshot.entity';
import { ProgramKpiSnapshotEntity } from '../entities/program-kpi-snapshot.entity';

describe('KPI Snapshot Entities', () => {
  describe('PortfolioKpiSnapshotEntity', () => {
    it('can be instantiated with required fields', () => {
      const entity = new PortfolioKpiSnapshotEntity();
      entity.workspaceId = 'ws-1';
      entity.portfolioId = 'pf-1';
      entity.asOfDate = '2026-02-10';
      entity.kpiCode = 'throughput';
      entity.valueNumeric = '42.0000';
      entity.engineVersion = '1.0.0';

      expect(entity.workspaceId).toBe('ws-1');
      expect(entity.kpiCode).toBe('throughput');
    });

    it('supports nullable fields', () => {
      const entity = new PortfolioKpiSnapshotEntity();
      expect(entity.valueNumeric).toBeUndefined();
      expect(entity.valueJson).toBeUndefined();
      expect(entity.inputHash).toBeUndefined();
    });
  });

  describe('ProgramKpiSnapshotEntity', () => {
    it('can be instantiated with required fields', () => {
      const entity = new ProgramKpiSnapshotEntity();
      entity.workspaceId = 'ws-1';
      entity.programId = 'pg-1';
      entity.asOfDate = '2026-02-10';
      entity.kpiCode = 'wip';
      entity.valueNumeric = '15.0000';
      entity.engineVersion = '1.0.0';

      expect(entity.programId).toBe('pg-1');
      expect(entity.kpiCode).toBe('wip');
    });
  });
});
