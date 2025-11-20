// LEGACY — Not used anywhere. Safe to remove in future cleanup.
// References old /pm/risk-management endpoints that no longer exist.
// If needed, update to use /api/risks/* endpoints from src/modules/risks.

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, Shield, TrendingUp, TrendingDown, Eye, Plus,
  Target, Clock, DollarSign, Users, BarChart3, Activity,
  CheckCircle, XCircle, AlertCircle, Info, Zap, Calendar,
  Filter, Search, Download, Settings, RefreshCcw, Bell
} from 'lucide-react';
import api from '../../../services/api';

interface RiskManagementDashboardProps {
  projectId: string;
  onRiskAnalyzed?: (analysisId: string) => void;
}

interface RiskData {
  id: string;
  title: string;
  description: string;
  category: string;
  probability: {
    score: number;
    confidence: number;
    rationale: string;
  };
  impact: {
    schedule: number;
    budget: number;
    scope: number;
    quality: number;
    overall: number;
  };
  riskScore: number;
  riskLevel: string;
  status: string;
  owner?: string;
  createdAt: string;
  triggers: {
    warningSignals: string[];
    leadIndicators: string[];
  };
}

interface RiskSummary {
  totalRisks: number;
  activeRisks: number;
  newRisks: number;
  closedRisks: number;
  riskDistribution: {
    veryHigh: number;
    high: number;
    medium: number;
    low: number;
    veryLow: number;
  };
  categoryBreakdown: Record<string, number>;
}

const RiskManagementDashboard: React.FC<RiskManagementDashboardProps> = ({
  projectId,
  onRiskAnalyzed
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [riskData, setRiskData] = useState<RiskData[]>([]);
  const [riskSummary, setRiskSummary] = useState<RiskSummary | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<RiskData | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');

  useEffect(() => {
    loadRiskData();
  }, [projectId]);

  const loadRiskData = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/pm/risk-management/register/${projectId}`);
      setRiskData(data.data.risks);
      setRiskSummary(data.data.summary);
    } catch (error) {
      console.error('Failed to load risk data:', error);
    } finally {
      setLoading(false);
    }
  };

  const performRiskAnalysis = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/pm/risk-management/analyze`, {
        method: 'POST',
        body: {
          projectId,
          riskSources: {
            projectData: true,
            externalFactors: true,
            stakeholderFeedback: true,
            historicalData: true,
            industryTrends: true,
            marketConditions: true,
          },
          scanDepth: 'comprehensive',
        },
      });
      if (onRiskAnalyzed && data.analysisId) {
        onRiskAnalyzed(data.analysisId);
      }

      // Refresh risk data
      loadRiskData();
    } catch (error) {
      console.error('Risk analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'very-high':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-red-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      case 'very-low':
        return 'bg-green-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'very-high':
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4" />;
      case 'low':
      case 'very-low':
        return <Info className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const filteredRisks = riskData.filter(risk => {
    if (filterCategory !== 'all' && risk.category !== filterCategory) return false;
    if (filterLevel !== 'all' && risk.riskLevel !== filterLevel) return false;
    return true;
  });

  const tabs = [
    { id: 'overview', label: 'Risk Overview', icon: BarChart3 },
    { id: 'matrix', label: 'Risk Matrix', icon: Target },
    { id: 'register', label: 'Risk Register', icon: Shield },
    { id: 'monitoring', label: 'Risk Monitoring', icon: Activity },
    { id: 'forecasting', label: 'Risk Forecasting', icon: TrendingUp },
  ];

  if (loading && !riskData.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Risk Management</h1>
          <p className="text-gray-600 mt-1">AI-powered risk identification, assessment, and response planning</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadRiskData}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={performRiskAnalysis}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            <Zap className="w-4 h-4 mr-2" />
            Analyze Risks
          </button>
        </div>
      </div>

      {/* Risk Summary Cards */}
      {riskSummary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Risks</p>
                <p className="text-2xl font-bold text-gray-900">{riskSummary.totalRisks}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">High/Critical</p>
                <p className="text-2xl font-bold text-red-600">
                  {riskSummary.riskDistribution.veryHigh + riskSummary.riskDistribution.high}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Medium Risk</p>
                <p className="text-2xl font-bold text-yellow-600">{riskSummary.riskDistribution.medium}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Low Risk</p>
                <p className="text-2xl font-bold text-green-600">
                  {riskSummary.riskDistribution.low + riskSummary.riskDistribution.veryLow}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Risks</p>
                <p className="text-2xl font-bold text-gray-900">{riskSummary.activeRisks}</p>
              </div>
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  selectedTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {selectedTab === 'overview' && <OverviewTab riskSummary={riskSummary} riskData={riskData} />}
        {selectedTab === 'matrix' && <RiskMatrixTab riskData={riskData} />}
        {selectedTab === 'register' && (
          <RiskRegisterTab
            riskData={filteredRisks}
            onRiskSelect={setSelectedRisk}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            filterLevel={filterLevel}
            setFilterLevel={setFilterLevel}
          />
        )}
        {selectedTab === 'monitoring' && <MonitoringTab riskData={riskData} />}
        {selectedTab === 'forecasting' && <ForecastingTab projectId={projectId} />}
      </div>

      {/* Risk Detail Modal */}
      {selectedRisk && (
        <RiskDetailModal
          risk={selectedRisk}
          onClose={() => setSelectedRisk(null)}
        />
      )}
    </div>
  );
};

const OverviewTab: React.FC<{ riskSummary: RiskSummary | null; riskData: RiskData[] }> = ({
  riskSummary,
  riskData
}) => {
  const categories = riskSummary ? Object.entries(riskSummary.categoryBreakdown) : [];
  const topRisks = riskData
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Level Distribution</h3>
          {riskSummary && (
            <div className="space-y-3">
              {Object.entries(riskSummary.riskDistribution).map(([level, count]) => (
                <div key={level} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{level.replace('-', ' ')}</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div
                        className={`h-2 rounded-full ${
                          level === 'veryHigh' ? 'bg-red-600' :
                          level === 'high' ? 'bg-red-500' :
                          level === 'medium' ? 'bg-yellow-500' :
                          level === 'low' ? 'bg-green-500' : 'bg-green-600'
                        }`}
                        style={{ width: `${(count / riskSummary.totalRisks) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-8">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Categories</h3>
          <div className="space-y-3">
            {categories.map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{category}</span>
                <div className="flex items-center">
                  <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(count / (riskSummary?.totalRisks || 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-6">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Risks */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Top Risks by Score</h3>
        <div className="space-y-4">
          {topRisks.map((risk) => (
            <div key={risk.id} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full mr-3 ${
                      risk.riskLevel === 'very-high' ? 'bg-red-600 text-white' :
                      risk.riskLevel === 'high' ? 'bg-red-500 text-white' :
                      risk.riskLevel === 'medium' ? 'bg-yellow-500 text-white' :
                      'bg-green-500 text-white'
                    }`}>
                      {risk.riskLevel.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500 capitalize">{risk.category}</span>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">{risk.title}</h4>
                  <p className="text-sm text-gray-600 mb-2">{risk.description}</p>
                  <div className="flex items-center text-xs text-gray-500">
                    <span>Probability: {risk.probability.score}/5</span>
                    <span className="mx-2">•</span>
                    <span>Impact: {risk.impact.overall}/5</span>
                    <span className="mx-2">•</span>
                    <span>Score: {risk.riskScore.toFixed(1)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{risk.riskScore.toFixed(1)}</div>
                  <div className="text-xs text-gray-500">Risk Score</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const RiskMatrixTab: React.FC<{ riskData: RiskData[] }> = ({ riskData }) => {
  const matrix = Array(5).fill(null).map(() => Array(5).fill([]));

  riskData.forEach(risk => {
    const probIndex = Math.min(Math.max(risk.probability.score - 1, 0), 4);
    const impactIndex = Math.min(Math.max(risk.impact.overall - 1, 0), 4);
    matrix[4 - probIndex][impactIndex] = [...matrix[4 - probIndex][impactIndex], risk];
  });

  const getCellColor = (probability: number, impact: number) => {
    const score = (probability + 1) * (impact + 1);
    if (score >= 20) return 'bg-red-600';
    if (score >= 15) return 'bg-red-500';
    if (score >= 10) return 'bg-yellow-500';
    if (score >= 6) return 'bg-green-500';
    return 'bg-green-600';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Probability vs Impact Matrix</h3>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Y-axis label */}
            <div className="flex items-center mb-4">
              <div className="w-12 text-center text-sm font-medium text-gray-700 transform -rotate-90">
                Probability
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-6 gap-1">
                  <div></div>
                  {['Very Low', 'Low', 'Medium', 'High', 'Very High'].map((impact, index) => (
                    <div key={index} className="text-center text-xs font-medium text-gray-700 p-2">
                      {impact}
                    </div>
                  ))}
                </div>

                {matrix.map((row, probIndex) => (
                  <div key={probIndex} className="grid grid-cols-6 gap-1">
                    <div className="text-center text-xs font-medium text-gray-700 p-2 flex items-center justify-center">
                      {['Very High', 'High', 'Medium', 'Low', 'Very Low'][probIndex]}
                    </div>
                    {row.map((cell, impactIndex) => (
                      <div
                        key={impactIndex}
                        className={`h-16 border border-gray-300 rounded flex items-center justify-center text-white text-xs font-medium ${getCellColor(4 - probIndex, impactIndex)}`}
                      >
                        {cell.length > 0 && (
                          <span className="bg-black bg-opacity-50 px-1 rounded">
                            {cell.length}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* X-axis label */}
            <div className="text-center text-sm font-medium text-gray-700 mt-2">
              Impact
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center space-x-6 text-xs">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-600 rounded mr-2"></div>
            <span>Very High Risk</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
            <span>High Risk</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
            <span>Medium Risk</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span>Low Risk</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-600 rounded mr-2"></div>
            <span>Very Low Risk</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const RiskRegisterTab: React.FC<{
  riskData: RiskData[];
  onRiskSelect: (risk: RiskData) => void;
  filterCategory: string;
  setFilterCategory: (category: string) => void;
  filterLevel: string;
  setFilterLevel: (level: string) => void;
}> = ({ riskData, onRiskSelect, filterCategory, setFilterCategory, filterLevel, setFilterLevel }) => {
  const categories = ['all', 'technical', 'resource', 'schedule', 'budget', 'scope', 'quality', 'external', 'stakeholder'];
  const levels = ['all', 'very-high', 'high', 'medium', 'low', 'very-low'];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          <Filter className="w-4 h-4 text-gray-500 mr-2" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          {levels.map(level => (
            <option key={level} value={level}>
              {level === 'all' ? 'All Risk Levels' : level.replace('-', ' ').toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Risk Register Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Probability
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Impact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {riskData.map((risk) => (
                <tr key={risk.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{risk.title}</div>
                      <div className="text-sm text-gray-500">{risk.description.substring(0, 100)}...</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 capitalize">
                      {risk.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {risk.probability.score}/5
                    <div className="text-xs text-gray-500">({risk.probability.confidence}% conf.)</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {risk.impact.overall}/5
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                      risk.riskLevel === 'very-high' ? 'bg-red-600 text-white' :
                      risk.riskLevel === 'high' ? 'bg-red-500 text-white' :
                      risk.riskLevel === 'medium' ? 'bg-yellow-500 text-white' :
                      risk.riskLevel === 'low' ? 'bg-green-500 text-white' :
                      'bg-green-600 text-white'
                    }`}>
                      {risk.riskLevel.replace('-', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {risk.riskScore.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => onRiskSelect(risk)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MonitoringTab: React.FC<{ riskData: RiskData[] }> = ({ riskData }) => {
  const activeRisks = riskData.filter(risk =>
    risk.riskLevel === 'high' || risk.riskLevel === 'very-high'
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Monitoring Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Active Risk Monitoring</h3>
          <div className="space-y-4">
            {activeRisks.slice(0, 5).map((risk) => (
              <div key={risk.id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-2">{risk.title}</h4>
                    <div className="text-sm text-gray-600 mb-2">
                      Warning Signals:
                    </div>
                    <ul className="text-xs text-gray-500 space-y-1">
                      {risk.triggers.warningSignals.map((signal, index) => (
                        <li key={index} className="flex items-center">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                          {signal}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                      risk.riskLevel === 'very-high' ? 'bg-red-600 text-white' :
                      'bg-red-500 text-white'
                    }`}>
                      {risk.riskLevel.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Trends */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Trends</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">New Risks (This Week)</span>
              <div className="flex items-center">
                <span className="text-lg font-medium">3</span>
                <TrendingUp className="w-4 h-4 text-red-500 ml-2" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Resolved Risks (This Week)</span>
              <div className="flex items-center">
                <span className="text-lg font-medium">2</span>
                <TrendingDown className="w-4 h-4 text-green-500 ml-2" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Risk Age</span>
              <span className="text-lg font-medium">14 days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Risk Escalations</span>
              <div className="flex items-center">
                <span className="text-lg font-medium">1</span>
                <AlertTriangle className="w-4 h-4 text-yellow-500 ml-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Alert Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">High Risk Threshold</span>
              <Bell className="w-4 h-4 text-gray-500" />
            </div>
                          <p className="text-xs text-gray-600">Alert when risk score &gt; 15</p>
            <p className="text-xs text-green-600 mt-1">✓ Configured</p>
          </div>

          <div className="p-4 border border-gray-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">New Risk Alerts</span>
              <Bell className="w-4 h-4 text-gray-500" />
            </div>
            <p className="text-xs text-gray-600">Daily digest of new risks</p>
            <p className="text-xs text-green-600 mt-1">✓ Configured</p>
          </div>

          <div className="p-4 border border-gray-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">Escalation Alerts</span>
              <Bell className="w-4 h-4 text-gray-500" />
            </div>
            <p className="text-xs text-gray-600">When risks increase in severity</p>
            <p className="text-xs text-green-600 mt-1">✓ Configured</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ForecastingTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [forecastData, setForecastData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForecastData();
  }, [projectId]);

  const loadForecastData = async () => {
    try {
      const data = await api.get(`/pm/risk-management/forecasting/${projectId}`);
      setForecastData(data.data);
    } catch (error) {
      console.error('Failed to load forecast data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Impact Forecast */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Project Impact Forecast</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Schedule Risk</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: '35%' }}></div>
                </div>
                <span className="text-sm font-medium">35%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Budget Risk</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>
                <span className="text-sm font-medium">25%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Scope Risk</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                </div>
                <span className="text-sm font-medium">15%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Quality Risk</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                </div>
                <span className="text-sm font-medium">20%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contingency Recommendations */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Contingency Recommendations</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center mb-2">
                <Calendar className="w-4 h-4 text-blue-600 mr-2" />
                <span className="font-medium text-blue-900">Schedule Buffer</span>
              </div>
              <p className="text-sm text-blue-800">Recommend 15% schedule buffer (8 days)</p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center mb-2">
                <DollarSign className="w-4 h-4 text-green-600 mr-2" />
                <span className="font-medium text-green-900">Budget Reserve</span>
              </div>
              <p className="text-sm text-green-800">Recommend 12% budget reserve ($60K)</p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center mb-2">
                <Users className="w-4 h-4 text-yellow-600 mr-2" />
                <span className="font-medium text-yellow-900">Resource Backup</span>
              </div>
              <p className="text-sm text-yellow-800">Identify backup senior developer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Emerging Risks */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Emerging Risk Projections</h3>
        <div className="space-y-4">
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Technology Platform Changes</h4>
              <span className="text-sm text-gray-500">Next 30 days</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Industry trend towards new framework versions may require adaptation
            </p>
            <div className="flex items-center">
              <span className="text-xs text-gray-500">Likelihood:</span>
              <div className="w-16 bg-gray-200 rounded-full h-1 mx-2">
                <div className="bg-yellow-500 h-1 rounded-full" style={{ width: '40%' }}></div>
              </div>
              <span className="text-xs font-medium">40%</span>
            </div>
          </div>

          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Resource Market Competition</h4>
              <span className="text-sm text-gray-500">Next 60 days</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Increased competition for specialized skills may affect resource retention
            </p>
            <div className="flex items-center">
              <span className="text-xs text-gray-500">Likelihood:</span>
              <div className="w-16 bg-gray-200 rounded-full h-1 mx-2">
                <div className="bg-red-500 h-1 rounded-full" style={{ width: '65%' }}></div>
              </div>
              <span className="text-xs font-medium">65%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RiskDetailModal: React.FC<{ risk: RiskData; onClose: () => void }> = ({ risk, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">{risk.title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700">{risk.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Risk Assessment</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Probability:</span>
                    <span>{risk.probability.score}/5 ({risk.probability.confidence}% confidence)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Overall Impact:</span>
                    <span>{risk.impact.overall}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Risk Score:</span>
                    <span className="font-medium">{risk.riskScore.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Impact Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Schedule:</span>
                    <span>{risk.impact.schedule}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Budget:</span>
                    <span>{risk.impact.budget}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scope:</span>
                    <span>{risk.impact.scope}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quality:</span>
                    <span>{risk.impact.quality}/5</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Warning Signals</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                {risk.triggers.warningSignals.map((signal, index) => (
                  <li key={index} className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                    {signal}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Lead Indicators</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                {risk.triggers.leadIndicators.map((indicator, index) => (
                  <li key={index} className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    {indicator}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskManagementDashboard;
