/**
 * Phase 2D: Portfolio Executive Summary Panel
 *
 * Read-only analytics surface. No drag. No redesign.
 * Shows: Total budget, Total actual, CPI, SPI, Projects at risk, Critical path slips.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  getPortfolioHealth,
  getPortfolioCriticalRisk,
  getPortfolioBaselineDrift,
  type PortfolioHealthData,
  type CriticalRiskData,
  type BaselineDriftData,
} from '../portfolio-analytics.api';
import { TrendingUp, AlertTriangle, Layers, BarChart3 } from 'lucide-react';

interface Props {
  portfolioId: string;
}

const fmtCurrency = (v: number) =>
  `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtRatio = (v: number | null) => (v != null ? v.toFixed(2) : '—');

export const PortfolioExecutiveSummary: React.FC<Props> = ({ portfolioId }) => {
  const [health, setHealth] = useState<PortfolioHealthData | null>(null);
  const [criticalRisk, setCriticalRisk] = useState<CriticalRiskData | null>(null);
  const [drift, setDrift] = useState<BaselineDriftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, c, d] = await Promise.all([
        getPortfolioHealth(portfolioId),
        getPortfolioCriticalRisk(portfolioId).catch(() => null),
        getPortfolioBaselineDrift(portfolioId).catch(() => null),
      ]);
      setHealth(h);
      setCriticalRisk(c);
      setDrift(d);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6 text-center text-slate-400 text-sm">
        Loading executive summary...
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <p className="text-sm text-amber-700">{error || 'No data available'}</p>
      </div>
    );
  }

  const cpiColor = health.aggregateCPI != null
    ? (health.aggregateCPI >= 1 ? 'text-green-600' : health.aggregateCPI >= 0.9 ? 'text-yellow-600' : 'text-red-600')
    : 'text-slate-500';
  const spiColor = health.aggregateSPI != null
    ? (health.aggregateSPI >= 1 ? 'text-green-600' : health.aggregateSPI >= 0.9 ? 'text-yellow-600' : 'text-red-600')
    : 'text-slate-500';

  return (
    <div className="space-y-4" data-testid="portfolio-executive-summary">
      {/* Financial Overview */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          Executive Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <SummaryCard label="Total Budget" value={fmtCurrency(health.totalBudget)} />
          <SummaryCard label="Total Actual Cost" value={fmtCurrency(health.totalActualCost)} />
          <SummaryCard label="Portfolio CPI" value={fmtRatio(health.aggregateCPI)} className={cpiColor} />
          <SummaryCard label="Portfolio SPI" value={fmtRatio(health.aggregateSPI)} className={spiColor} />
          <SummaryCard
            label="Projects At Risk"
            value={String(health.atRiskProjectsCount)}
            className={health.atRiskProjectsCount > 0 ? 'text-red-600' : 'text-green-600'}
          />
          <SummaryCard label="Total Projects" value={String(health.projectCount)} />
        </div>
      </div>

      {/* At-Risk Projects */}
      {health.atRiskProjectsCount > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Projects At Risk ({health.atRiskProjectsCount})
          </h3>
          <div className="space-y-2">
            {health.projects
              .filter((p) => p.isAtRisk)
              .map((p) => (
                <div
                  key={p.projectId}
                  className="flex items-center justify-between py-2 px-3 rounded bg-red-50 text-sm"
                >
                  <span className="font-medium text-slate-800">{p.projectName}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span>CPI: <span className={p.cpi != null && p.cpi < 0.9 ? 'text-red-600 font-semibold' : ''}>
                      {fmtRatio(p.cpi)}
                    </span></span>
                    <span>SPI: <span className={p.spi != null && p.spi < 0.9 ? 'text-red-600 font-semibold' : ''}>
                      {fmtRatio(p.spi)}
                    </span></span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Critical Path Risk */}
      {criticalRisk && criticalRisk.projectsWithSlip > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-orange-500" />
            Critical Path Slippage ({criticalRisk.projectsWithSlip} projects)
          </h3>
          <div className="space-y-2">
            {criticalRisk.projects.slice(0, 10).map((p) => (
              <div
                key={p.projectId}
                className="flex items-center justify-between py-2 px-3 rounded bg-orange-50 text-sm"
              >
                <span className="font-medium text-slate-800">{p.projectName}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-orange-700 font-medium">
                    Slip: {Math.round(p.criticalPathSlipMinutes / 60)}h
                  </span>
                  <span className="text-slate-500">{p.countLate} tasks late</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Baseline Drift */}
      {drift && drift.projectsWithBaseline > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-blue-500" />
            Baseline Drift (Avg: {Math.round(drift.averageEndVarianceMinutes / 60)}h)
          </h3>
          <div className="space-y-2">
            {drift.projects.map((p) => (
              <div
                key={p.projectId}
                className="flex items-center justify-between py-2 px-3 rounded bg-blue-50 text-sm"
              >
                <div>
                  <span className="font-medium text-slate-800">{p.projectName}</span>
                  <span className="text-xs text-slate-500 ml-2">{p.baselineName}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-blue-700 font-medium">
                    Max slip: {Math.round(p.maxSlipMinutes / 60)}h
                  </span>
                  <span className="text-slate-500">{p.countLate} late</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{
  label: string;
  value: string;
  className?: string;
}> = ({ label, value, className = '' }) => (
  <div className="bg-slate-50 rounded-lg p-3 text-center">
    <p className={`text-lg font-bold ${className || 'text-slate-900'}`}>{value}</p>
    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
  </div>
);
