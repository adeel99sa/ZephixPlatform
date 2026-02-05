import React, { useState } from 'react';
import { AlertTriangle, Shield, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle, Clock } from 'lucide-react';

interface RiskAssessmentProps {
  risks: any;
  onUpdate: (risks: any) => void;
}

const RiskAssessment: React.FC<RiskAssessmentProps> = ({ risks, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'matrix' | 'summary'>('list');

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProbabilityColor = (probability: string) => {
    switch (probability) {
      case 'high':
        return 'text-red-600 font-semibold';
      case 'medium':
        return 'text-yellow-600 font-semibold';
      case 'low':
        return 'text-green-600 font-semibold';
      default:
        return 'text-gray-600';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-600 font-semibold';
      case 'medium':
        return 'text-yellow-600 font-semibold';
      case 'low':
        return 'text-green-600 font-semibold';
      default:
        return 'text-gray-600';
    }
  };

  const getResponseStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'avoid':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'transfer':
        return <Shield className="h-4 w-4 text-blue-500" />;
      case 'mitigate':
        return <TrendingDown className="h-4 w-4 text-yellow-500" />;
      case 'accept':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getResponseStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'avoid':
        return 'bg-red-100 text-red-800';
      case 'transfer':
        return 'bg-blue-100 text-blue-800';
      case 'mitigate':
        return 'bg-yellow-100 text-yellow-800';
      case 'accept':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderRiskList = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(risks?.risks || []).map((risk: any, index: number) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                <h4 className="font-medium text-gray-900">{risk.category}</h4>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRiskLevelColor(risk.riskLevel)}`}>
                {risk.riskLevel} Risk
              </span>
            </div>
            
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Description:</span>
                <p className="text-gray-900 mt-1">{risk.description}</p>
              </div>
              
              <div className="flex justify-between">
                <div>
                  <span className="font-medium text-gray-700">Probability:</span>
                  <p className={getProbabilityColor(risk.probability)}>
                    {risk.probability}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Impact:</span>
                  <p className={getImpactColor(risk.impact)}>
                    {risk.impact}
                  </p>
                </div>
              </div>

              <div>
                <span className="font-medium text-gray-700">Response Strategy:</span>
                <div className="flex items-center mt-1">
                  {getResponseStrategyIcon(risk.responseStrategy)}
                  <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getResponseStrategyColor(risk.responseStrategy)}`}>
                    {risk.responseStrategy}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-medium text-gray-700">Owner:</span>
                <p className="text-gray-900">{risk.owner || 'Not assigned'}</p>
              </div>

              {risk.responseActions && risk.responseActions.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Response Actions:</span>
                  <ul className="text-gray-900 mt-1 space-y-1">
                    {risk.responseActions.map((action: string, actionIndex: number) => (
                      <li key={actionIndex} className="text-xs">• {action}</li>
                    ))}
                  </ul>
                </div>
              )}

              {risk.triggerConditions && risk.triggerConditions.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Trigger Conditions:</span>
                  <ul className="text-gray-900 mt-1 space-y-1">
                    {risk.triggerConditions.map((condition: string, conditionIndex: number) => (
                      <li key={conditionIndex} className="text-xs">• {condition}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRiskMatrix = () => {
    const riskMatrix = {
      high: { high: [], medium: [], low: [] },
      medium: { high: [], medium: [], low: [] },
      low: { high: [], medium: [], low: [] },
    };

    // Populate risk matrix
    (risks?.risks || []).forEach((risk: any) => {
      const prob = risk.probability as string;
      const impact = risk.impact as string;
      if (prob in riskMatrix && impact in (riskMatrix as any)[prob]) {
        ((riskMatrix as any)[prob][impact] as any[]).push(risk);
      }
    });

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Probability-Impact Matrix</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead>
                <tr>
                  <th className="border border-gray-200 px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700">
                    Probability \ Impact
                  </th>
                  <th className="border border-gray-200 px-4 py-2 bg-red-50 text-sm font-medium text-red-700">
                    High Impact
                  </th>
                  <th className="border border-gray-200 px-4 py-2 bg-yellow-50 text-sm font-medium text-yellow-700">
                    Medium Impact
                  </th>
                  <th className="border border-gray-200 px-4 py-2 bg-green-50 text-sm font-medium text-green-700">
                    Low Impact
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 px-4 py-2 bg-red-50 text-sm font-medium text-red-700">
                    High Probability
                  </td>
                  <td className="border border-gray-200 px-4 py-2 bg-red-100 min-h-[100px]">
                    {riskMatrix.high.high.map((risk: any, index: number) => (
                      <div key={index} className="text-xs mb-1 p-1 bg-white rounded">
                        <div className="font-medium">{risk.category}</div>
                        <div className="text-gray-600">{risk.riskLevel} risk</div>
                      </div>
                    ))}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 bg-yellow-100 min-h-[100px]">
                    {riskMatrix.high.medium.map((risk: any, index: number) => (
                      <div key={index} className="text-xs mb-1 p-1 bg-white rounded">
                        <div className="font-medium">{risk.category}</div>
                        <div className="text-gray-600">{risk.riskLevel} risk</div>
                      </div>
                    ))}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 bg-green-100 min-h-[100px]">
                    {riskMatrix.high.low.map((risk: any, index: number) => (
                      <div key={index} className="text-xs mb-1 p-1 bg-white rounded">
                        <div className="font-medium">{risk.category}</div>
                        <div className="text-gray-600">{risk.riskLevel} risk</div>
                      </div>
                    ))}
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-2 bg-yellow-50 text-sm font-medium text-yellow-700">
                    Medium Probability
                  </td>
                  <td className="border border-gray-200 px-4 py-2 bg-yellow-100 min-h-[100px]">
                    {riskMatrix.medium.high.map((risk: any, index: number) => (
                      <div key={index} className="text-xs mb-1 p-1 bg-white rounded">
                        <div className="font-medium">{risk.category}</div>
                        <div className="text-gray-600">{risk.riskLevel} risk</div>
                      </div>
                    ))}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 bg-yellow-100 min-h-[100px]">
                    {riskMatrix.medium.medium.map((risk: any, index: number) => (
                      <div key={index} className="text-xs mb-1 p-1 bg-white rounded">
                        <div className="font-medium">{risk.category}</div>
                        <div className="text-gray-600">{risk.riskLevel} risk</div>
                      </div>
                    ))}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 bg-green-100 min-h-[100px]">
                    {riskMatrix.medium.low.map((risk: any, index: number) => (
                      <div key={index} className="text-xs mb-1 p-1 bg-white rounded">
                        <div className="font-medium">{risk.category}</div>
                        <div className="text-gray-600">{risk.riskLevel} risk</div>
                      </div>
                    ))}
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-4 py-2 bg-green-50 text-sm font-medium text-green-700">
                    Low Probability
                  </td>
                  <td className="border border-gray-200 px-4 py-2 bg-green-100 min-h-[100px]">
                    {riskMatrix.low.high.map((risk: any, index: number) => (
                      <div key={index} className="text-xs mb-1 p-1 bg-white rounded">
                        <div className="font-medium">{risk.category}</div>
                        <div className="text-gray-600">{risk.riskLevel} risk</div>
                      </div>
                    ))}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 bg-green-100 min-h-[100px]">
                    {riskMatrix.low.medium.map((risk: any, index: number) => (
                      <div key={index} className="text-xs mb-1 p-1 bg-white rounded">
                        <div className="font-medium">{risk.category}</div>
                        <div className="text-gray-600">{risk.riskLevel} risk</div>
                      </div>
                    ))}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 bg-green-100 min-h-[100px]">
                    {riskMatrix.low.low.map((risk: any, index: number) => (
                      <div key={index} className="text-xs mb-1 p-1 bg-white rounded">
                        <div className="font-medium">{risk.category}</div>
                        <div className="text-gray-600">{risk.riskLevel} risk</div>
                      </div>
                    ))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderRiskSummary = () => {
    const summary = risks?.riskSummary || {};
    
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{summary.totalRisks || 0}</div>
              <div className="text-sm text-gray-600">Total Risks</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{summary.highRisks || 0}</div>
              <div className="text-sm text-red-600">High Risks</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{summary.mediumRisks || 0}</div>
              <div className="text-sm text-yellow-600">Medium Risks</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{summary.lowRisks || 0}</div>
              <div className="text-sm text-green-600">Low Risks</div>
            </div>
          </div>
        </div>

        {/* Response Strategy Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Strategy Breakdown</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {['avoid', 'transfer', 'mitigate', 'accept'].map((strategy) => {
              const strategyRisks = (risks?.risks || []).filter((risk: any) => risk.responseStrategy === strategy);
              return (
                <div key={strategy} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    {getResponseStrategyIcon(strategy)}
                    <span className="ml-2 font-medium text-gray-900 capitalize">{strategy}</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{strategyRisks.length}</div>
                  <div className="text-sm text-gray-600">risks</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Risk Categories */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Categories</h3>
          
          <div className="space-y-3">
            {Object.entries(
              (risks?.risks || []).reduce((acc: any, risk: any) => {
                acc[risk.category] = (acc[risk.category] || 0) + 1;
                return acc;
              }, {})
            ).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">{category}</span>
                <span className="text-sm text-gray-600">{String(count)} risks</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Risk Assessment</h2>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span className="text-sm text-orange-600 font-medium">
              {risks?.risks?.length || 0} Risks Identified
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'list', label: 'Risk List', icon: AlertTriangle },
              { id: 'matrix', label: 'Risk Matrix', icon: TrendingUp },
              { id: 'summary', label: 'Summary', icon: Shield },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'list' && renderRiskList()}
        {activeTab === 'matrix' && renderRiskMatrix()}
        {activeTab === 'summary' && renderRiskSummary()}
      </div>
    </div>
  );
};

export default RiskAssessment;
