import React from 'react';
import { Brain, CheckCircle } from 'lucide-react';

interface BRDAnalysisResult {
  extractedElements: {
    constraints: {
      timeline: string;
      budget: string;
      resources: string[];
      technology: string[];
      regulatory: string[];
    };
    deliverables: Array<{
      name: string;
      description: string;
      acceptanceCriteria: string[];
      priority: 'high' | 'medium' | 'low';
    }>;
  };
}

export const MethodologySelector: React.FC<{
  selected: string;
  onSelect: (methodology: string) => void;
  analysis: BRDAnalysisResult;
}> = ({ selected, onSelect, analysis }) => {
  const methodologies = [
    {
      id: 'waterfall',
      name: 'Waterfall',
      description: 'Sequential phases with clear deliverables and milestones',
      bestFor: ['Fixed requirements', 'Regulatory projects', 'Hardware development'],
      timeline: 'Longer, predictable',
      flexibility: 'Low',
      visibility: 'High at milestones'
    },
    {
      id: 'agile',
      name: 'Agile',
      description: 'Iterative development with regular feedback and adaptation',
      bestFor: ['Evolving requirements', 'Software development', 'Innovation projects'],
      timeline: 'Shorter iterations',
      flexibility: 'High',
      visibility: 'Continuous'
    },
    {
      id: 'hybrid',
      name: 'Hybrid',
      description: 'Combines waterfall planning with agile execution',
      bestFor: ['Complex projects', 'Mixed teams', 'Regulatory + innovation'],
      timeline: 'Planned phases, agile sprints',
      flexibility: 'Medium',
      visibility: 'Both milestone + continuous'
    }
  ];

  // AI recommendation based on analysis
  const getRecommendation = () => {
    const { constraints, deliverables } = analysis.extractedElements;
    
    // Check for regulatory requirements
    const hasRegulatory = constraints.regulatory && constraints.regulatory.length > 0;
    
    // Check for evolving requirements (high priority deliverables)
    const hasEvolvingRequirements = deliverables.some(d => d.priority === 'high');
    
    // Check timeline constraints
    const hasTightTimeline = constraints.timeline && constraints.timeline.includes('urgent');
    
    if (hasRegulatory && !hasEvolvingRequirements) {
      return 'Waterfall methodology recommended due to regulatory requirements and stable scope.';
    } else if (hasEvolvingRequirements && !hasTightTimeline) {
      return 'Agile methodology recommended for evolving requirements and iterative development.';
    } else if (hasRegulatory && hasEvolvingRequirements) {
      return 'Hybrid methodology recommended to balance regulatory compliance with flexibility.';
    } else {
      return 'Agile methodology recommended for most software projects with evolving requirements.';
    }
  };

  return (
    <div className="methodology-selector">
      <div className="ai-recommendation">
        <Brain className="recommendation-icon" />
        <div>
          <h4>AI Recommendation</h4>
          <p>{getRecommendation()}</p>
        </div>
      </div>

      <div className="methodology-grid">
        {methodologies.map(methodology => (
          <div
            key={methodology.id}
            onClick={() => onSelect(methodology.id)}
            className={`methodology-card ${selected === methodology.id ? 'selected' : ''}`}
          >
            <div className="methodology-header">
              <h3>{methodology.name}</h3>
              {selected === methodology.id && <CheckCircle className="selected-icon" />}
            </div>
            
            <p className="methodology-description">{methodology.description}</p>
            
            <div className="methodology-details">
              <div className="detail-item">
                <span className="label">Best for:</span>
                <ul>
                  {methodology.bestFor.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">Timeline:</span>
                  <span>{methodology.timeline}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Flexibility:</span>
                  <span>{methodology.flexibility}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Visibility:</span>
                  <span>{methodology.visibility}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
