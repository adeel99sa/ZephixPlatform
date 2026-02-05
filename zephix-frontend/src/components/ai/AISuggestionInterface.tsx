import React, { useState } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  PencilIcon, 
  ArrowPathIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export interface AIRecommendation {
  id: string;
  type: 'requirement' | 'timeline' | 'resource' | 'risk' | 'methodology';
  title: string;
  description: string;
  reasoning: string[];
  confidence: number;
  dataSources: string[];
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  alternatives?: string[];
  createdAt: Date;
  // Status and action tracking
  status?: 'pending' | 'accepted' | 'dismissed' | 'modified';
  acceptedAt?: Date;
  dismissedAt?: Date;
  modifiedAt?: Date;
  alternativeAddedAt?: Date;
  dismissReason?: string;
  modifications?: Record<string, unknown>;
}

export interface AISuggestionInterfaceProps {
  recommendations: AIRecommendation[];
  onAccept: (recommendation: AIRecommendation) => void;
  onModify: (recommendation: AIRecommendation, modifications: any) => void;
  onAlternative: (recommendation: AIRecommendation, alternative: string) => void;
  onDismiss: (recommendation: AIRecommendation, reason: string) => void;
  className?: string;
}

export const AISuggestionInterface: React.FC<AISuggestionInterfaceProps> = ({
  recommendations,
  onAccept,
  onModify,
  onAlternative,
  onDismiss,
  className = ''
}) => {
  const [expandedRecommendations, setExpandedRecommendations] = useState<Set<string>>(new Set());
  const [modifyMode, setModifyMode] = useState<string | null>(null);
  const [modifications, setModifications] = useState<Record<string, any>>({});
  const [alternativeText, setAlternativeText] = useState<Record<string, string>>({});
  const [dismissReason, setDismissReason] = useState<Record<string, string>>({});

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedRecommendations);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRecommendations(newExpanded);
  };

  const handleModify = (recommendation: AIRecommendation) => {
    if (modifyMode === recommendation.id) {
      // Submit modifications
      onModify(recommendation, modifications[recommendation.id] || {});
      setModifyMode(null);
      setModifications(prev => {
        const newMods = { ...prev };
        delete newMods[recommendation.id];
        return newMods;
      });
    } else {
      setModifyMode(recommendation.id);
      setModifications(prev => ({
        ...prev,
        [recommendation.id]: { description: recommendation.description }
      }));
    }
  };

  const handleAlternative = (recommendation: AIRecommendation) => {
    const alternative = alternativeText[recommendation.id];
    if (alternative && alternative.trim()) {
      onAlternative(recommendation, alternative.trim());
      setAlternativeText(prev => {
        const newAlts = { ...prev };
        delete newAlts[recommendation.id];
        return newAlts;
      });
    }
  };

  const handleDismiss = (recommendation: AIRecommendation) => {
    const reason = dismissReason[recommendation.id];
    if (reason && reason.trim()) {
      onDismiss(recommendation, reason.trim());
      setDismissReason(prev => {
        const newReasons = { ...prev };
        delete newReasons[recommendation.id];
        return newReasons;
      });
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (recommendations.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No AI Recommendations</h3>
        <p className="mt-1 text-sm text-gray-500">
          AI will analyze your document and provide recommendations here.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          AI Recommendations
        </h3>
        <span className="text-sm text-gray-500">
          {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''}
        </span>
      </div>

      {recommendations.map((recommendation) => (
        <div
          key={recommendation.id}
          className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        >
          {/* Recommendation Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {recommendation.type}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(recommendation.confidence)}`}>
                    {recommendation.confidence}% confidence
                  </span>
                </div>
                
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  {recommendation.title}
                </h4>
                
                <p className="text-sm text-gray-600 line-clamp-2">
                  {recommendation.description}
                </p>
              </div>

              <button
                onClick={() => toggleExpanded(recommendation.id)}
                className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              >
                {expandedRecommendations.has(recommendation.id) ? (
                  <XMarkIcon className="h-4 w-4" />
                ) : (
                  <InformationCircleIcon className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center space-x-2 mt-3">
              <button
                onClick={() => onAccept(recommendation)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <CheckIcon className="h-3 w-3 mr-1" />
                Accept
              </button>

              <button
                onClick={() => handleModify(recommendation)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PencilIcon className="h-3 w-3 mr-1" />
                Modify
              </button>

              <button
                onClick={() => setAlternativeText(prev => ({ ...prev, [recommendation.id]: '' }))}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowPathIcon className="h-3 w-3 mr-1" />
                Alternative
              </button>

              <button
                onClick={() => setDismissReason(prev => ({ ...prev, [recommendation.id]: '' }))}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <XMarkIcon className="h-3 w-3 mr-1" />
                Dismiss
              </button>
            </div>
          </div>

          {/* Expanded Content */}
          {expandedRecommendations.has(recommendation.id) && (
            <div className="p-4 bg-gray-50">
              {/* Reasoning Section */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-900 mb-2">AI Reasoning</h5>
                <div className="space-y-2">
                  {recommendation.reasoning.map((reason, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                      <p className="text-sm text-gray-600">{reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-xs font-medium text-gray-500">Impact</span>
                  <div className={`mt-1 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(recommendation.impact)}`}>
                    {recommendation.impact.charAt(0).toUpperCase() + recommendation.impact.slice(1)}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Effort</span>
                  <div className={`mt-1 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEffortColor(recommendation.effort)}`}>
                    {recommendation.effort.charAt(0).toUpperCase() + recommendation.effort.slice(1)}
                  </div>
                </div>
              </div>

              {/* Data Sources */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Data Sources</h5>
                <div className="flex flex-wrap gap-2">
                  {recommendation.dataSources.map((source, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              </div>

              {/* Alternatives */}
              {recommendation.alternatives && recommendation.alternatives.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Alternative Approaches</h5>
                  <div className="space-y-2">
                    {recommendation.alternatives.map((alternative, index) => (
                      <div key={index} className="text-sm text-gray-600 bg-white p-2 rounded border">
                        {alternative}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modification Interface */}
              {modifyMode === recommendation.id && (
                <div className="mb-4 p-3 bg-white rounded border">
                  <h6 className="text-sm font-medium text-gray-900 mb-2">Modify Recommendation</h6>
                  <textarea
                    value={modifications[recommendation.id]?.description || ''}
                    onChange={(e) => setModifications(prev => ({
                      ...prev,
                      [recommendation.id]: { ...prev[recommendation.id], description: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Describe your modifications..."
                  />
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={() => handleModify(recommendation)}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Submit
                    </button>
                    <button
                      onClick={() => setModifyMode(null)}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Alternative Input */}
              {alternativeText[recommendation.id] !== undefined && (
                <div className="mb-4 p-3 bg-white rounded border">
                  <h6 className="text-sm font-medium text-gray-900 mb-2">Suggest Alternative</h6>
                  <textarea
                    value={alternativeText[recommendation.id] || ''}
                    onChange={(e) => setAlternativeText(prev => ({
                      ...prev,
                      [recommendation.id]: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Describe your alternative approach..."
                  />
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={() => handleAlternative(recommendation)}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Submit
                    </button>
                    <button
                      onClick={() => setAlternativeText(prev => {
                        const newAlts = { ...prev };
                        delete newAlts[recommendation.id];
                        return newAlts;
                      })}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Dismiss Reason Input */}
              {dismissReason[recommendation.id] !== undefined && (
                <div className="mb-4 p-3 bg-white rounded border">
                  <h6 className="text-sm font-medium text-gray-900 mb-2">Dismiss Recommendation</h6>
                  <textarea
                    value={dismissReason[recommendation.id] || ''}
                    onChange={(e) => setDismissReason(prev => ({
                      ...prev,
                      [recommendation.id]: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={3}
                    placeholder="Why are you dismissing this recommendation?"
                  />
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={() => handleDismiss(recommendation)}
                      className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => setDismissReason(prev => {
                        const newReasons = { ...prev };
                        delete newReasons[recommendation.id];
                        return newReasons;
                      })}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
