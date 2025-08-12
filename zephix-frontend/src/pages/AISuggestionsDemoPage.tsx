import React from 'react';
import { AISuggestionInterface, AIRecommendation } from '../components/ai/AISuggestionInterface';
import { useAIRecommendations } from '../hooks/useAIRecommendations';

// Sample AI recommendations for demonstration
const sampleRecommendations: AIRecommendation[] = [
  {
    id: '1',
    type: 'requirement',
    title: 'Add User Authentication System',
    description: 'Implement OAuth 2.0 with JWT tokens for secure user authentication and session management.',
    reasoning: [
      'Security analysis shows current system lacks proper authentication',
      'User feedback indicates need for personalized experiences',
      'Industry standards recommend OAuth 2.0 for web applications'
    ],
    confidence: 92,
    dataSources: ['Security Audit Report', 'User Feedback Survey', 'Industry Standards'],
    impact: 'high',
    effort: 'medium',
    alternatives: [
      'Use SAML for enterprise integration',
      'Implement basic username/password with 2FA'
    ],
    createdAt: new Date()
  },
  {
    id: '2',
    type: 'timeline',
    title: 'Extend Project Timeline by 2 Weeks',
    description: 'Current timeline is too aggressive. Recommend extending development phase to ensure quality and reduce risk.',
    reasoning: [
      'Team capacity analysis shows current timeline is unrealistic',
      'Risk assessment identifies high probability of delays',
      'Quality metrics suggest rushed development leads to technical debt'
    ],
    confidence: 87,
    dataSources: ['Team Capacity Analysis', 'Risk Assessment Report', 'Quality Metrics'],
    impact: 'medium',
    effort: 'low',
    alternatives: [
      'Reduce scope to meet current timeline',
      'Add more developers to maintain timeline'
    ],
    createdAt: new Date()
  },
  {
    id: '3',
    type: 'resource',
    title: 'Hire Senior Frontend Developer',
    description: 'Current team lacks expertise in modern React patterns. Recommend hiring experienced frontend developer.',
    reasoning: [
      'Code review shows inconsistent React patterns',
      'Performance metrics indicate optimization opportunities',
      'Team feedback suggests knowledge gaps in advanced React concepts'
    ],
    confidence: 78,
    dataSources: ['Code Review Analysis', 'Performance Metrics', 'Team Feedback'],
    impact: 'high',
    effort: 'high',
    alternatives: [
      'Provide React training for existing team members',
      'Contract with React consultant for specific tasks'
    ],
    createdAt: new Date()
  },
  {
    id: '4',
    type: 'risk',
    title: 'Database Migration Risk Mitigation',
    description: 'High risk identified in database migration plan. Recommend implementing rollback strategy and testing procedures.',
    reasoning: [
      'Database complexity analysis shows high migration risk',
      'Historical data shows 30% of migrations encounter issues',
      'Business impact assessment indicates potential service disruption'
    ],
    confidence: 85,
    dataSources: ['Database Complexity Analysis', 'Historical Migration Data', 'Business Impact Assessment'],
    impact: 'high',
    effort: 'medium',
    alternatives: [
      'Use blue-green deployment strategy',
      'Implement gradual migration with feature flags'
    ],
    createdAt: new Date()
  },
  {
    id: '5',
    type: 'methodology',
    title: 'Adopt Test-Driven Development',
    description: 'Current testing approach is reactive. Recommend implementing TDD to improve code quality and reduce bugs.',
    reasoning: [
      'Bug analysis shows 40% of issues could be prevented with TDD',
      'Code quality metrics indicate need for better testing practices',
      'Team velocity analysis shows TDD improves long-term productivity'
    ],
    confidence: 81,
    dataSources: ['Bug Analysis Report', 'Code Quality Metrics', 'Team Velocity Analysis'],
    impact: 'medium',
    effort: 'high',
    alternatives: [
      'Implement comprehensive unit testing without TDD',
      'Use behavior-driven development (BDD) approach'
    ],
    createdAt: new Date()
  }
];

export const AISuggestionsDemoPage: React.FC = () => {
  const {
    recommendations,
    actions,
    acceptRecommendation,
    modifyRecommendation,
    suggestAlternative,
    dismissRecommendation,
    clearActions
  } = useAIRecommendations();

  // Initialize with sample data
  React.useEffect(() => {
    if (recommendations.length === 0) {
      sampleRecommendations.forEach(rec => {
        // Add a small delay to simulate loading
        setTimeout(() => {
          // This would normally come from the useAIRecommendations hook
          // For demo purposes, we'll just show the static data
        }, 100);
      });
    }
  }, [recommendations.length]);

  const handleAccept = (recommendation: AIRecommendation) => {
    acceptRecommendation(recommendation);
    console.log('Accepted recommendation:', recommendation.title);
  };

  const handleModify = (recommendation: AIRecommendation, modifications: any) => {
    modifyRecommendation(recommendation, modifications);
    console.log('Modified recommendation:', recommendation.title, modifications);
  };

  const handleAlternative = (recommendation: AIRecommendation, alternative: string) => {
    suggestAlternative(recommendation, alternative);
    console.log('Suggested alternative for:', recommendation.title, alternative);
  };

  const handleDismiss = (recommendation: AIRecommendation, reason: string) => {
    dismissRecommendation(recommendation, reason);
    console.log('Dismissed recommendation:', recommendation.title, reason);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Suggestions Interface Demo
          </h1>
          <p className="text-lg text-gray-600">
            Experience the AI-powered recommendation system with transparent reasoning, 
            confidence scores, and multiple response options.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{sampleRecommendations.length}</div>
            <div className="text-sm text-gray-600">Active Recommendations</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-green-600">{actions.filter(a => a.type === 'accept').length}</div>
            <div className="text-sm text-gray-600">Accepted</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-yellow-600">{actions.filter(a => a.type === 'modify').length}</div>
            <div className="text-sm text-gray-600">Modified</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-red-600">{actions.filter(a => a.type === 'dismiss').length}</div>
            <div className="text-sm text-gray-600">Dismissed</div>
          </div>
        </div>

        {/* AI Suggestions Interface */}
        <div className="bg-white rounded-lg shadow-sm">
          <AISuggestionInterface
            recommendations={sampleRecommendations}
            onAccept={handleAccept}
            onModify={handleModify}
            onAlternative={handleAlternative}
            onDismiss={handleDismiss}
            className="p-6"
          />
        </div>

        {/* Actions History */}
        {actions.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Action History</h3>
              <button
                onClick={clearActions}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear History
              </button>
            </div>
            <div className="space-y-3">
              {actions.map((action, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                  <div className={`w-3 h-3 rounded-full ${
                    action.type === 'accept' ? 'bg-green-500' :
                    action.type === 'modify' ? 'bg-blue-500' :
                    action.type === 'alternative' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">
                      {action.type.charAt(0).toUpperCase() + action.type.slice(1)}ed:
                    </span>
                    <span className="text-sm text-gray-600 ml-2">
                      {action.recommendation.title}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {action.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Use</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Quick Actions</h4>
              <ul className="space-y-1">
                <li>• <strong>Accept:</strong> Approve the recommendation as-is</li>
                <li>• <strong>Modify:</strong> Edit the recommendation content</li>
                <li>• <strong>Alternative:</strong> Suggest a different approach</li>
                <li>• <strong>Dismiss:</strong> Reject with a reason</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Explore Details</h4>
              <ul className="space-y-1">
                <li>• Click the info icon to expand recommendations</li>
                <li>• View AI reasoning and data sources</li>
                <li>• See confidence scores and impact metrics</li>
                <li>• Check alternative approaches</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
