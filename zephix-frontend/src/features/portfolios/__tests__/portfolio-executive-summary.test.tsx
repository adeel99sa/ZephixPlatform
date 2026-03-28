/**
 * Phase 2D: Portfolio Executive Summary frontend test.
 * Validates rendering of analytics panel.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the API
const mockHealth = vi.fn();
const mockCritical = vi.fn();
const mockDrift = vi.fn();

vi.mock('../portfolio-analytics.api', () => ({
  getPortfolioHealth: (...args: any[]) => mockHealth(...args),
  getPortfolioCriticalRisk: (...args: any[]) => mockCritical(...args),
  getPortfolioBaselineDrift: (...args: any[]) => mockDrift(...args),
}));

import { PortfolioExecutiveSummary } from '../components/PortfolioExecutiveSummary';

describe('PortfolioExecutiveSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders executive summary panel with health data', async () => {
    mockHealth.mockResolvedValue({
      portfolioId: 'pf-1',
      portfolioName: 'Test PF',
      projectCount: 5,
      totalBudget: 500000,
      totalActualCost: 300000,
      aggregateCPI: 1.05,
      aggregateSPI: 0.95,
      criticalProjectsCount: 0,
      atRiskProjectsCount: 1,
      projects: [{
        projectId: 'p1',
        projectName: 'Project A',
        budget: 100000,
        actualCost: 80000,
        cpi: 0.85,
        spi: 0.88,
        isAtRisk: true,
        riskReasons: ['CPI 0.85 < 0.9'],
      }],
    });
    mockCritical.mockResolvedValue({ projectsWithSlip: 0, projects: [] });
    mockDrift.mockResolvedValue({ projectsWithBaseline: 0, projects: [], averageEndVarianceMinutes: 0 });

    render(<PortfolioExecutiveSummary portfolioId="pf-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('portfolio-executive-summary')).toBeTruthy();
    });

    expect(screen.getByText('$500,000')).toBeTruthy();
    expect(screen.getByText('$300,000')).toBeTruthy();
    expect(screen.getByText('1.05')).toBeTruthy();
    expect(screen.getByText('0.95')).toBeTruthy();
  });

  it('shows at-risk projects section when risks exist', async () => {
    mockHealth.mockResolvedValue({
      portfolioId: 'pf-1',
      portfolioName: 'Test PF',
      projectCount: 2,
      totalBudget: 200000,
      totalActualCost: 150000,
      aggregateCPI: 0.88,
      aggregateSPI: 0.92,
      criticalProjectsCount: 0,
      atRiskProjectsCount: 1,
      projects: [{
        projectId: 'p1',
        projectName: 'Troubled Project',
        budget: 100000,
        actualCost: 90000,
        cpi: 0.75,
        spi: 0.86,
        isAtRisk: true,
        riskReasons: ['CPI 0.75 < 0.9'],
      }],
    });
    mockCritical.mockRejectedValue(new Error('Not available'));
    mockDrift.mockRejectedValue(new Error('Not available'));

    render(<PortfolioExecutiveSummary portfolioId="pf-1" />);

    await waitFor(() => {
      expect(screen.getByText('Troubled Project')).toBeTruthy();
    });
  });

  it('handles API error gracefully', async () => {
    mockHealth.mockRejectedValue(new Error('Network error'));

    render(<PortfolioExecutiveSummary portfolioId="pf-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load|Network error/)).toBeTruthy();
    });
  });
});
