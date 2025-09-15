import React, { useState, useCallback } from 'react';
import { 
  PMDocumentAnalysis, 
  OrganizationContext, 
  DocumentIntelligenceProps,
  DocumentIntelligenceState 
} from '../../types/document-intelligence.types';
import api from '../../services/api';

const DocumentIntelligence: React.FC<DocumentIntelligenceProps> = ({ 
  onAnalysisComplete, 
  onError 
}) => {
  const [state, setState] = useState<DocumentIntelligenceState>({
    document: null,
    analysis: null,
    processing: false,
    error: null,
    activeTab: 'process'
  });

  const [organizationContext, setOrganizationContext] = useState<OrganizationContext>({
    industry: 'technology',
    projectComplexity: 'medium',
    organizationalMaturity: 'intermediate',
    preferredMethodology: 'hybrid'
  });

  const handleDocumentUpload = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, processing: true, error: null }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', detectDocumentType(file.name));
      formData.append('organizationContext', JSON.stringify(organizationContext));

      const response = await api.get('/ai-intelligence/pm-document-upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to analyze document');
      }

      const result = await response.json();
      
      if (result.success) {
        setState(prev => ({ 
          ...prev, 
          analysis: result.analysis, 
          processing: false 
        }));
        onAnalysisComplete?.(result.analysis);
      } else {
        throw new Error('Analysis failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({ 
        ...prev, 
        processing: false, 
        error: errorMessage 
      }));
      onError?.(errorMessage);
    }
  }, [organizationContext, onAnalysisComplete, onError]);

  const detectDocumentType = (filename: string): 'PROJECT_CHARTER' | 'REQUIREMENTS' | 'TECHNICAL_SPEC' | 'MEETING_NOTES' | 'OTHER' => {
  const lowerFilename = filename.toLowerCase();
  
  if (lowerFilename.includes('charter') || lowerFilename.includes('project_charter')) {
      return 'PROJECT_CHARTER';
    } else if (lowerFilename.includes('requirements') || lowerFilename.includes('req')) {
      return 'REQUIREMENTS';
    } else if (lowerFilename.includes('technical') || lowerFilename.includes('spec')) {
      return 'TECHNICAL_SPEC';
    } else if (lowerFilename.includes('meeting') || lowerFilename.includes('notes')) {
      return 'MEETING_NOTES';
    } else {
      return 'OTHER';
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setState(prev => ({ ...prev, document: file }));
      handleDocumentUpload(file);
    }
  };

  const handleContextChange = (field: keyof OrganizationContext, value: any) => {
    setOrganizationContext(prev => ({ ...prev, [field]: value }));
  };

  const renderMethodologyCard = (analysis: PMDocumentAnalysis) => (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        📋 Recommended Project Approach
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-3xl font-bold text-indigo-600 mb-2">
            {analysis.methodologyAnalysis.recommendedApproach}
          </div>
          <div className="text-gray-700">
            <strong>Reasoning:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {analysis.methodologyAnalysis.reasoning.map((reason, index) => (
                <li key={index} className="text-sm">{reason}</li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <div className="text-lg font-semibold text-purple-600 mb-2">
            Lifecycle Phases
          </div>
          <div className="space-y-2">
            {analysis.methodologyAnalysis.lifecyclePhases.map((phase, index) => (
              <div key={index} className="text-sm bg-white rounded px-3 py-2 border">
                {phase.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPeopleAnalysis = (analysis: PMDocumentAnalysis) => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 People & Stakeholders</h3>
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-800 mb-2">Key Stakeholders</h4>
          <div className="space-y-2">
            {analysis.peopleAnalysis.stakeholderMap.slice(0, 3).map((stakeholder, index) => (
              <div key={index} className="text-sm bg-gray-50 rounded px-3 py-2">
                <span className="font-medium">{stakeholder.name}</span> - {stakeholder.role}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-medium text-gray-800 mb-2">Team Requirements</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.peopleAnalysis.teamRequirements.slice(0, 4).map((skill, index) => (
              <span key={index} className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-1">
                {skill.skillName}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderProcessAnalysis = (analysis: PMDocumentAnalysis) => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Process & Execution</h3>
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-800 mb-2">Critical Activities</h4>
          <div className="space-y-2">
            {analysis.processAnalysis.activities.slice(0, 3).map((activity, index) => (
              <div key={index} className="text-sm bg-gray-50 rounded px-3 py-2">
                {activity.name}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-medium text-gray-800 mb-2">Key Risks</h4>
          <div className="space-y-2">
            {analysis.processAnalysis.identifiedRisks.slice(0, 2).map((risk, index) => (
              <div key={index} className="text-sm bg-red-50 text-red-800 rounded px-3 py-2">
                {risk.description}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBusinessAnalysis = (analysis: PMDocumentAnalysis) => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">💼 Business Value</h3>
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-800 mb-2">Value Propositions</h4>
          <div className="space-y-2">
            {analysis.businessAnalysis.businessValue.slice(0, 3).map((value, index) => (
              <div key={index} className="text-sm bg-green-50 text-green-800 rounded px-3 py-2">
                {value.description}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-medium text-gray-800 mb-2">Compliance Needs</h4>
          <div className="space-y-2">
            {analysis.businessAnalysis.complianceNeeds.slice(0, 2).map((compliance, index) => (
              <div key={index} className="text-sm bg-yellow-50 text-yellow-800 rounded px-3 py-2">
                {compliance.requirement}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderOverviewCards = (analysis: PMDocumentAnalysis) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">People Analysis</h3>
        <div className="text-2xl font-bold text-blue-600">{analysis.peopleAnalysis.stakeholderMap.length}</div>
        <div className="text-sm text-blue-700">Stakeholders Identified</div>
      </div>
      <div className="bg-green-50 rounded-lg p-6 border border-green-200">
        <h3 className="font-semibold text-green-900 mb-2">Process Analysis</h3>
        <div className="text-2xl font-bold text-green-600">{analysis.processAnalysis.activities.length}</div>
        <div className="text-sm text-green-700">Key Activities</div>
      </div>
      <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
        <h3 className="font-semibold text-purple-900 mb-2">Business Value</h3>
        <div className="text-2xl font-bold text-purple-600">{analysis.businessAnalysis.businessValue.length}</div>
        <div className="text-sm text-purple-700">Value Drivers</div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      
      {/* Document Upload */}
      <div className="mb-8">
        <div className="border-2 border-dashed border-indigo-300 rounded-xl p-8 text-center bg-indigo-50">
          <h2 className="text-2xl font-bold text-indigo-900 mb-4">
            Professional Project Management Intelligence
          </h2>
          <p className="text-indigo-700 mb-6">
            Upload any project document for comprehensive analysis using industry-standard PM practices
          </p>
          
          {/* Organization Context Form */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <select 
                value={organizationContext.industry}
                onChange={(e) => handleContextChange('industry', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="technology">Technology</option>
                <option value="healthcare">Healthcare</option>
                <option value="finance">Finance</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="retail">Retail</option>
                <option value="education">Education</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Complexity</label>
              <select 
                value={organizationContext.projectComplexity}
                onChange={(e) => handleContextChange('projectComplexity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organizational Maturity</label>
              <select 
                value={organizationContext.organizationalMaturity}
                onChange={(e) => handleContextChange('organizationalMaturity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Methodology</label>
              <select 
                value={organizationContext.preferredMethodology}
                onChange={(e) => handleContextChange('preferredMethodology', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="agile">Agile</option>
                <option value="waterfall">Waterfall</option>
                <option value="hybrid">Hybrid</option>
                <option value="lean">Lean</option>
              </select>
            </div>
          </div>
          
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md"
            onChange={handleFileChange}
            className="mb-4"
            disabled={state.processing}
          />
          <div className="text-sm text-indigo-600">
                            Supports: Project Charter, Requirements, Technical Specs, Meeting Notes
          </div>
        </div>
      </div>
      
      {/* Processing State */}
      {state.processing && (
        <div className="mb-8 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-xl text-gray-700">Applying professional PM expertise...</p>
          <p className="text-sm text-gray-500">Analyzing people, process, and business dimensions</p>
        </div>
      )}
      
      {/* Error State */}
      {state.error && (
        <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Analysis Error</h3>
              <div className="mt-2 text-sm text-red-700">
                {state.error}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Analysis Results */}
      {state.analysis && (
        <div className="space-y-6">
          
          {/* Analysis Overview Cards */}
          {renderOverviewCards(state.analysis)}
          
          {/* Methodology Recommendation */}
          {renderMethodologyCard(state.analysis)}
          
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'people', label: 'People', icon: '👥' },
                { id: 'process', label: 'Process', icon: '⚙️' },
                { id: 'business', label: 'Business', icon: '💼' },
                { id: 'methodology', label: 'Methodology', icon: '📋' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setState(prev => ({ ...prev, activeTab: tab.id as any }))}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    state.activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Tab Content */}
          <div className="mt-6">
            {state.activeTab === 'people' && renderPeopleAnalysis(state.analysis)}
            {state.activeTab === 'process' && renderProcessAnalysis(state.analysis)}
            {state.activeTab === 'business' && renderBusinessAnalysis(state.analysis)}
            {state.activeTab === 'methodology' && renderMethodologyCard(state.analysis)}
          </div>
          
        </div>
      )}
      
    </div>
  );
};

export default DocumentIntelligence;
