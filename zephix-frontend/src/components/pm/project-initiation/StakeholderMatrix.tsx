import React, { useState } from 'react';
import { Users, Grid, TrendingUp, UserCheck, UserX, UserMinus, UserPlus } from 'lucide-react';

interface StakeholderMatrixProps {
  stakeholders: any;
  onUpdate: (stakeholders: any) => void;
}

const StakeholderMatrix: React.FC<StakeholderMatrixProps> = ({ stakeholders, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'raci' | 'grid'>('list');

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'champion':
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'supporter':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'neutral':
        return <UserMinus className="h-4 w-4 text-gray-500" />;
      case 'critic':
        return <UserX className="h-4 w-4 text-orange-500" />;
      case 'blocker':
        return <UserX className="h-4 w-4 text-red-500" />;
      default:
        return <Users className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'champion':
        return 'bg-green-100 text-green-800';
      case 'supporter':
        return 'bg-blue-100 text-blue-800';
      case 'neutral':
        return 'bg-gray-100 text-gray-800';
      case 'critic':
        return 'bg-orange-100 text-orange-800';
      case 'blocker':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInfluenceColor = (influence: string) => {
    switch (influence) {
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

  const getInterestColor = (interest: string) => {
    switch (interest) {
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

  const renderStakeholderList = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(stakeholders?.stakeholders || []).map((stakeholder: any, index: number) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                {getCategoryIcon(stakeholder.category)}
                <h4 className="ml-2 font-medium text-gray-900">{stakeholder.name}</h4>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(stakeholder.category)}`}>
                {stakeholder.category}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Role:</span>
                <p className="text-gray-900">{stakeholder.role}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Organization:</span>
                <p className="text-gray-900">{stakeholder.organization}</p>
              </div>
              <div className="flex justify-between">
                <div>
                  <span className="font-medium text-gray-700">Influence:</span>
                  <p className={getInfluenceColor(stakeholder.influence)}>
                    {stakeholder.influence}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Interest:</span>
                  <p className={getInterestColor(stakeholder.interest)}>
                    {stakeholder.interest}
                  </p>
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Engagement Strategy:</span>
                <p className="text-gray-900 text-xs">{stakeholder.engagementStrategy}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRACIMatrix = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">RACI Matrix</h3>
          <p className="text-sm text-gray-600">Responsible, Accountable, Consulted, Informed</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Responsible
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Accountable
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Consulted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Informed
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(stakeholders?.raciMatrix || []).map((raci: any, index: number) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {raci.activity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {raci.responsible?.join(', ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {raci.accountable}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {raci.consulted?.join(', ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {raci.informed?.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderInfluenceInterestGrid = () => {
    const grid = stakeholders?.influenceInterestGrid || {};
    
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Influence-Interest Grid</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Manage Closely */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <TrendingUp className="h-4 w-4 text-red-500 mr-2" />
                <h4 className="font-medium text-red-900">Manage Closely</h4>
              </div>
              <p className="text-sm text-red-700 mb-2">High Influence, High Interest</p>
              <ul className="text-sm text-red-800 space-y-1">
                {grid.manageClosely?.map((stakeholder: string, index: number) => (
                  <li key={index}>• {stakeholder}</li>
                ))}
              </ul>
            </div>

            {/* Keep Satisfied */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <UserCheck className="h-4 w-4 text-yellow-500 mr-2" />
                <h4 className="font-medium text-yellow-900">Keep Satisfied</h4>
              </div>
              <p className="text-sm text-yellow-700 mb-2">High Influence, Low Interest</p>
              <ul className="text-sm text-yellow-800 space-y-1">
                {grid.keepSatisfied?.map((stakeholder: string, index: number) => (
                  <li key={index}>• {stakeholder}</li>
                ))}
              </ul>
            </div>

            {/* Keep Informed */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <UserPlus className="h-4 w-4 text-blue-500 mr-2" />
                <h4 className="font-medium text-blue-900">Keep Informed</h4>
              </div>
              <p className="text-sm text-blue-700 mb-2">Low Influence, High Interest</p>
              <ul className="text-sm text-blue-800 space-y-1">
                {grid.keepInformed?.map((stakeholder: string, index: number) => (
                  <li key={index}>• {stakeholder}</li>
                ))}
              </ul>
            </div>

            {/* Monitor */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <UserMinus className="h-4 w-4 text-gray-500 mr-2" />
                <h4 className="font-medium text-gray-900">Monitor</h4>
              </div>
              <p className="text-sm text-gray-700 mb-2">Low Influence, Low Interest</p>
              <ul className="text-sm text-gray-800 space-y-1">
                {grid.monitor?.map((stakeholder: string, index: number) => (
                  <li key={index}>• {stakeholder}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Communication Needs */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Communication Needs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(stakeholders?.stakeholders || []).map((stakeholder: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <h4 className="font-medium text-gray-900 mb-2">{stakeholder.name}</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {(stakeholder.communicationNeeds || []).map((need: string, needIndex: number) => (
                    <li key={needIndex}>• {need}</li>
                  ))}
                </ul>
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
          <h2 className="text-xl font-semibold text-gray-900">Stakeholder Analysis</h2>
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-green-500" />
            <span className="text-sm text-green-600 font-medium">
              {stakeholders?.stakeholders?.length || 0} Stakeholders Identified
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'list', label: 'Stakeholder List', icon: Users },
              { id: 'raci', label: 'RACI Matrix', icon: Grid },
              { id: 'grid', label: 'Influence-Interest Grid', icon: TrendingUp },
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
        {activeTab === 'list' && renderStakeholderList()}
        {activeTab === 'raci' && renderRACIMatrix()}
        {activeTab === 'grid' && renderInfluenceInterestGrid()}
      </div>
    </div>
  );
};

export default StakeholderMatrix;
