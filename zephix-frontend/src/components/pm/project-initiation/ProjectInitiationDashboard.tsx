import React, { useState } from 'react';
import { Upload, FileText, Users, AlertTriangle, Target, Download, CheckCircle, Clock } from 'lucide-react';
import { useProjectInitiation } from '../../../hooks/useProjectInitiation';
import { getErrorMessage } from '@/lib/api/errors';
import DocumentUpload from './DocumentUpload';
import CharterView from './CharterView';
import StakeholderMatrix from './StakeholderMatrix';
import RiskAssessment from './RiskAssessment';
import WBSViewer from './WBSViewer';

interface ProjectInitiationDashboardProps {
  onProjectCreated: (projectId: string) => void;
}

type TabType = 'upload' | 'charter' | 'stakeholders' | 'risks' | 'wbs' | 'metrics';

interface ProjectData {
  projectId: string;
  charter: any;
  stakeholders: any;
  risks: any;
  wbsStructure: any;
  analysis: any;
  recommendations: any;
}

const ProjectInitiationDashboard: React.FC<ProjectInitiationDashboardProps> = ({ onProjectCreated }) => {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readinessScore, setReadinessScore] = useState(0);

  const { analyzeDocument, getProject, updateCharter, exportProject } = useProjectInitiation();

  const handleDocumentAnalysis = async (file: File, type: string, orgContext: unknown) => {
    setLoading(true);
    setError(null);

    try {
      const result = await analyzeDocument(file, type, orgContext);
      // Narrow result to ProjectData
      if (result && typeof result === 'object' && 'projectId' in result) {
        const data = result as ProjectData;
        setProjectData(data);
        setActiveTab('charter');
        
        // Calculate initial readiness score
        calculateReadinessScore(data);
        
        // Notify parent component
        onProjectCreated(data.projectId);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const calculateReadinessScore = (data: ProjectData) => {
    let score = 0;
    let totalWeight = 0;

    // Charter completeness (30% weight)
    if (data.charter) {
      const charterFields = ['projectTitle', 'businessCase', 'projectObjectives', 'successCriteria'];
      const completedFields = charterFields.filter(field => data.charter[field]);
      score += (completedFields.length / charterFields.length) * 30;
    }
    totalWeight += 30;

    // Stakeholder analysis (20% weight)
    if (data.stakeholders?.stakeholders?.length > 0) {
      score += Math.min(20, data.stakeholders.stakeholders.length * 4);
    }
    totalWeight += 20;

    // Risk assessment (20% weight)
    if (data.risks?.risks?.length > 0) {
      score += Math.min(20, data.risks.risks.length * 5);
    }
    totalWeight += 20;

    // WBS structure (20% weight)
    if (data.wbsStructure?.level1?.length > 0) {
      score += Math.min(20, data.wbsStructure.level1.length * 10);
    }
    totalWeight += 20;

    // Recommendations (10% weight)
    if (data.recommendations) {
      score += 10;
    }
    totalWeight += 10;

    setReadinessScore(Math.round(score));
  };

  const handleCharterUpdate = async (updates: unknown) => {
    if (!projectData) return;

    try {
      const updatedCharter = await updateCharter(projectData.projectId, updates);
      // Narrow updatedCharter to object type
      const charterData = updatedCharter && typeof updatedCharter === 'object' ? updatedCharter : {};
      setProjectData(prev => prev ? {
        ...prev,
        charter: { ...prev.charter, ...charterData }
      } : null);
      
      // Recalculate readiness score
      if (projectData) {
        calculateReadinessScore({
          ...projectData,
          charter: { ...projectData.charter, ...charterData }
        });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleExport = async (format: string) => {
    if (!projectData) return;

    try {
      const result = await exportProject(projectData.projectId, { format });
      // Handle export result (download file, etc.)
      console.log('Export result:', result);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const tabs = [
    { id: 'upload', label: 'Document Upload', icon: Upload, disabled: false },
    { id: 'charter', label: 'Project Charter', icon: FileText, disabled: !projectData },
    { id: 'stakeholders', label: 'Stakeholders', icon: Users, disabled: !projectData },
    { id: 'risks', label: 'Risk Assessment', icon: AlertTriangle, disabled: !projectData },
    { id: 'wbs', label: 'Work Breakdown', icon: Target, disabled: !projectData },
    { id: 'metrics', label: 'Readiness', icon: CheckCircle, disabled: !projectData },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'upload':
        return (
          <DocumentUpload
            onAnalysisComplete={handleDocumentAnalysis}
            loading={loading}
            error={error}
          />
        );
      case 'charter':
        return projectData && (
          <CharterView
            charter={projectData.charter}
            onUpdate={handleCharterUpdate}
            recommendations={projectData.recommendations}
          />
        );
      case 'stakeholders':
        return projectData && (
          <StakeholderMatrix
            stakeholders={projectData.stakeholders}
            onUpdate={(stakeholders) => {
              setProjectData(prev => prev ? { ...prev, stakeholders } : null);
            }}
          />
        );
      case 'risks':
        return projectData && (
          <RiskAssessment
            risks={projectData.risks}
            onUpdate={(risks) => {
              setProjectData(prev => prev ? { ...prev, risks } : null);
            }}
          />
        );
      case 'wbs':
        return projectData && (
          <WBSViewer
            wbsStructure={projectData.wbsStructure}
            onUpdate={(wbsStructure) => {
              setProjectData(prev => prev ? { ...prev, wbsStructure } : null);
            }}
          />
        );
      case 'metrics':
        return (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Readiness Assessment</h3>
              
              {/* Overall Readiness Score */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Readiness</span>
                  <span className="text-lg font-bold text-gray-900">{readinessScore}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      readinessScore >= 80 ? 'bg-green-500' : 
                      readinessScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${readinessScore}%` }}
                  ></div>
                </div>
              </div>

              {/* Detailed Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <FileText className="w-4 h-4 text-blue-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Charter Completeness</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {projectData?.charter ? 'Complete' : 'Incomplete'}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Users className="w-4 h-4 text-green-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Stakeholders Identified</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {projectData?.stakeholders?.stakeholders?.length || 0}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Risks Assessed</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {projectData?.risks?.risks?.length || 0}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Target className="w-4 h-4 text-purple-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">WBS Items</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {projectData?.wbsStructure?.level1?.length || 0}
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {projectData?.recommendations && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">AI Recommendations</h4>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Recommended Methodology:</span>
                        <p className="text-sm text-gray-900 font-medium">{projectData.recommendations.methodology}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Team Size:</span>
                        <p className="text-sm text-gray-900 font-medium">{projectData.recommendations.teamSize}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Project Initiation</h1>
              {projectData && (
                <span className="ml-4 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  Project Created
                </span>
              )}
            </div>
            
            {projectData && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleExport('pdf')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTab(tab.id as TabType)}
                  disabled={tab.disabled}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : tab.disabled
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
        )}

        {loading && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-blue-400 mr-3 animate-spin" />
              <div className="text-sm text-blue-700">Analyzing document...</div>
            </div>
          </div>
        )}

        {renderTabContent()}
      </div>
    </div>
  );
};

export default ProjectInitiationDashboard;
