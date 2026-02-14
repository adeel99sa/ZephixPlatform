/**
 * Phase 2D: Portfolio Analytics API client
 */
import { api } from '@/lib/api';

export interface PortfolioProjectHealth {
  projectId: string;
  projectName: string;
  budget: number;
  actualCost: number;
  cpi: number | null;
  spi: number | null;
  isAtRisk: boolean;
  riskReasons: string[];
}

export interface PortfolioHealthData {
  portfolioId: string;
  portfolioName: string;
  projectCount: number;
  totalBudget: number;
  totalActualCost: number;
  aggregateCPI: number | null;
  aggregateSPI: number | null;
  averageScheduleVarianceMinutes: number;
  criticalProjectsCount: number;
  atRiskProjectsCount: number;
  projects: PortfolioProjectHealth[];
}

export interface CriticalRiskProject {
  projectId: string;
  projectName: string;
  criticalPathSlipMinutes: number;
  maxTaskSlipMinutes: number;
  countLate: number;
}

export interface CriticalRiskData {
  portfolioId: string;
  totalProjects: number;
  projectsWithSlip: number;
  projects: CriticalRiskProject[];
}

export interface BaselineDriftProject {
  projectId: string;
  projectName: string;
  baselineId: string;
  baselineName: string;
  countLate: number;
  maxSlipMinutes: number;
  criticalPathSlipMinutes: number;
}

export interface BaselineDriftData {
  portfolioId: string;
  totalProjects: number;
  projectsWithBaseline: number;
  averageEndVarianceMinutes: number;
  projects: BaselineDriftProject[];
}

export async function getPortfolioHealth(portfolioId: string): Promise<PortfolioHealthData> {
  const res = await api.get(`/portfolios/${portfolioId}/health`);
  return res.data?.data ?? res.data;
}

export async function getPortfolioCriticalRisk(portfolioId: string): Promise<CriticalRiskData> {
  const res = await api.get(`/portfolios/${portfolioId}/critical-risk`);
  return res.data?.data ?? res.data;
}

export async function getPortfolioBaselineDrift(portfolioId: string): Promise<BaselineDriftData> {
  const res = await api.get(`/portfolios/${portfolioId}/baseline-drift`);
  return res.data?.data ?? res.data;
}

export async function addProjectToPortfolio(portfolioId: string, projectId: string): Promise<void> {
  await api.post(`/portfolios/${portfolioId}/projects/${projectId}`);
}

export async function removeProjectFromPortfolio(portfolioId: string, projectId: string): Promise<void> {
  await api.delete(`/portfolios/${portfolioId}/projects/${projectId}`);
}
