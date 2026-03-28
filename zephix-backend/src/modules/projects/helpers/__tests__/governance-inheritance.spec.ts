import {
  applyPortfolioGovernanceDefaults,
  hasExplicitGovernanceFlags,
  GOV_FLAG_KEYS,
} from '../governance-inheritance';
import { PortfolioGovernanceMode } from '../../../portfolios/entities/portfolio.entity';

describe('governance-inheritance', () => {
  const makePortfolio = (flags: Record<string, any> = {}) => ({
    id: 'pf-1',
    costTrackingEnabled: flags.costTrackingEnabled ?? true,
    baselinesEnabled: flags.baselinesEnabled ?? true,
    iterationsEnabled: flags.iterationsEnabled ?? false,
    changeManagementEnabled: flags.changeManagementEnabled ?? true,
    inheritedGovernanceMode: PortfolioGovernanceMode.PORTFOLIO_DEFAULTS,
  });

  const makeProject = (overrides: Record<string, any> = {}) => ({
    costTrackingEnabled: false,
    baselinesEnabled: false,
    iterationsEnabled: false,
    changeManagementEnabled: false,
    governanceSource: null,
    ...overrides,
  });

  describe('GOV_FLAG_KEYS', () => {
    it('contains exactly 4 governance flag keys', () => {
      expect(GOV_FLAG_KEYS).toHaveLength(4);
      expect(GOV_FLAG_KEYS).toEqual([
        'costTrackingEnabled',
        'baselinesEnabled',
        'iterationsEnabled',
        'changeManagementEnabled',
      ]);
    });
  });

  describe('applyPortfolioGovernanceDefaults', () => {
    it('applies portfolio flags when governanceSource is null', () => {
      const project = makeProject();
      const portfolio = makePortfolio() as any;
      const applied = applyPortfolioGovernanceDefaults(project, portfolio);
      expect(applied).toBe(true);
      expect(project.costTrackingEnabled).toBe(true);
      expect(project.baselinesEnabled).toBe(true);
      expect(project.iterationsEnabled).toBe(false);
      expect(project.changeManagementEnabled).toBe(true);
      expect(project.governanceSource).toBe('PORTFOLIO');
    });

    it('does not apply when governanceSource is USER and force=false', () => {
      const project = makeProject({ governanceSource: 'USER' });
      const portfolio = makePortfolio() as any;
      const applied = applyPortfolioGovernanceDefaults(project, portfolio);
      expect(applied).toBe(false);
      expect(project.governanceSource).toBe('USER');
    });

    it('does not apply when governanceSource is TEMPLATE and force=false', () => {
      const project = makeProject({ governanceSource: 'TEMPLATE' });
      const portfolio = makePortfolio() as any;
      const applied = applyPortfolioGovernanceDefaults(project, portfolio);
      expect(applied).toBe(false);
      expect(project.governanceSource).toBe('TEMPLATE');
    });

    it('applies with force=true even when governanceSource is USER', () => {
      const project = makeProject({ governanceSource: 'USER', costTrackingEnabled: false });
      const portfolio = makePortfolio({ costTrackingEnabled: true }) as any;
      const applied = applyPortfolioGovernanceDefaults(project, portfolio, { force: true });
      expect(applied).toBe(true);
      expect(project.costTrackingEnabled).toBe(true);
      expect(project.governanceSource).toBe('PORTFOLIO');
    });

    it('skips when onlyIfUnset=true and governanceSource is set', () => {
      const project = makeProject({ governanceSource: 'TEMPLATE' });
      const portfolio = makePortfolio() as any;
      const applied = applyPortfolioGovernanceDefaults(project, portfolio, { onlyIfUnset: true });
      expect(applied).toBe(false);
    });

    it('applies when onlyIfUnset=true and governanceSource is null', () => {
      const project = makeProject({ governanceSource: null });
      const portfolio = makePortfolio() as any;
      const applied = applyPortfolioGovernanceDefaults(project, portfolio, { onlyIfUnset: true });
      expect(applied).toBe(true);
      expect(project.governanceSource).toBe('PORTFOLIO');
    });

    it('applies LEGACY treated as overridable without force', () => {
      const project = makeProject({ governanceSource: 'LEGACY' });
      const portfolio = makePortfolio() as any;
      const applied = applyPortfolioGovernanceDefaults(project, portfolio);
      expect(applied).toBe(true);
      expect(project.governanceSource).toBe('PORTFOLIO');
    });
  });

  // ── Precedence: template > portfolio > user ─────────────────────────

  describe('governance precedence', () => {
    it('TEMPLATE source blocks portfolio inheritance (template wins)', () => {
      const project = makeProject({
        governanceSource: 'TEMPLATE',
        costTrackingEnabled: true,
        baselinesEnabled: false,
      });
      const portfolio = makePortfolio({ costTrackingEnabled: false, baselinesEnabled: true }) as any;
      const applied = applyPortfolioGovernanceDefaults(project, portfolio);
      expect(applied).toBe(false);
      expect(project.costTrackingEnabled).toBe(true);
      expect(project.baselinesEnabled).toBe(false);
      expect(project.governanceSource).toBe('TEMPLATE');
    });

    it('USER source blocks portfolio inheritance (user explicit wins)', () => {
      const project = makeProject({
        governanceSource: 'USER',
        costTrackingEnabled: false,
      });
      const portfolio = makePortfolio({ costTrackingEnabled: true }) as any;
      const applied = applyPortfolioGovernanceDefaults(project, portfolio);
      expect(applied).toBe(false);
      expect(project.costTrackingEnabled).toBe(false);
      expect(project.governanceSource).toBe('USER');
    });

    it('PORTFOLIO applies when no prior source (null/LEGACY)', () => {
      const project = makeProject({ governanceSource: null });
      const portfolio = makePortfolio({ costTrackingEnabled: true }) as any;
      const applied = applyPortfolioGovernanceDefaults(project, portfolio);
      expect(applied).toBe(true);
      expect(project.costTrackingEnabled).toBe(true);
      expect(project.governanceSource).toBe('PORTFOLIO');
    });
  });

  describe('hasExplicitGovernanceFlags', () => {
    it('returns true when any governance flag is present', () => {
      expect(hasExplicitGovernanceFlags({ costTrackingEnabled: true })).toBe(true);
      expect(hasExplicitGovernanceFlags({ baselinesEnabled: false })).toBe(true);
    });

    it('returns false when no governance flags are present', () => {
      expect(hasExplicitGovernanceFlags({ name: 'Test' })).toBe(false);
      expect(hasExplicitGovernanceFlags({})).toBe(false);
    });

    it('returns false when governance flags are undefined', () => {
      expect(hasExplicitGovernanceFlags({ costTrackingEnabled: undefined })).toBe(false);
    });
  });
});
