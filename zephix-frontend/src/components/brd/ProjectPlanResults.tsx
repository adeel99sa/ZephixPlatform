import React, { useState } from 'react';
import { brdApi } from '../../services/api';

interface GeneratedProjectPlan {
  id: string;
  methodology: string;
  planStructure: {
    tasks: Array<{
      id: string;
      name: string;
      description: string;
      duration: number;
      dependencies: string[];
    }>;
  };
  resourcePlan: {
    timeline: {
      duration: string;
      phases: Array<{
        name: string;
        duration: string;
        tasks: string[];
      }>;
    };
    resources: Array<{
      role: string;
      count: number;
      skills: string[];
    }>;
    budget: {
      total: number;
      breakdown: Record<string, number>;
    };
  };
  riskRegister: Array<{
    id: string;
    risk: string;
    impact: 'high' | 'medium' | 'low';
    probability: 'high' | 'medium' | 'low';
    mitigation: string;
    owner: string;
  }>;
  generationMetadata: {
    confidence: number;
    processingTime: number;
    recommendations: string[];
  };
}

// Sub-components
const PlanOverview: React.FC<{ plan: GeneratedProjectPlan }> = ({ plan }) => (
  <div className="plan-overview">
    <div className="overview-grid">
      <div className="overview-card">
        <h4>Project Summary</h4>
        <p>Generated using {plan.methodology} methodology with {Math.round(plan.generationMetadata.confidence * 100)}% confidence.</p>
        <div className="metrics">
          <div className="metric">
            <span className="label">Total Tasks:</span>
            <span className="value">{plan.planStructure.tasks.length}</span>
          </div>
          <div className="metric">
            <span className="label">Timeline:</span>
            <span className="value">{plan.resourcePlan.timeline.duration}</span>
          </div>
          <div className="metric">
            <span className="label">Budget:</span>
            <span className="value">${plan.resourcePlan.budget.total.toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      <div className="overview-card">
        <h4>Key Recommendations</h4>
        <ul>
          {plan.generationMetadata.recommendations.map((rec, index) => (
            <li key={index}>{rec}</li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

const PlanTimeline: React.FC<{ plan: GeneratedProjectPlan; methodology: string }> = ({ plan, methodology }) => (
  <div className="plan-timeline">
    <h4>Project Timeline - {methodology} Approach</h4>
    <div className="timeline-phases">
      {plan.resourcePlan.timeline.phases.map((phase, index) => (
        <div key={index} className="timeline-phase">
          <div className="phase-header">
            <h5>{phase.name}</h5>
            <span className="phase-duration">{phase.duration}</span>
          </div>
          <div className="phase-tasks">
            {phase.tasks.map(taskId => {
              const task = plan.planStructure.tasks.find(t => t.id === taskId);
              return task ? (
                <div key={task.id} className="phase-task">
                  <span className="task-name">{task.name}</span>
                  <span className="task-duration">{task.duration} days</span>
                </div>
              ) : null;
            })}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ResourcePlan: React.FC<{ plan: GeneratedProjectPlan }> = ({ plan }) => (
  <div className="resource-plan">
    <h4>Resource Allocation</h4>
    <div className="resource-grid">
      {plan.resourcePlan.resources.map((resource, index) => (
        <div key={index} className="resource-card">
          <h5>{resource.role}</h5>
          <div className="resource-details">
            <span className="count">{resource.count} people</span>
            <div className="skills">
              {resource.skills.map((skill, skillIndex) => (
                <span key={skillIndex} className="skill-tag">{skill}</span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
    
    <div className="budget-breakdown">
      <h5>Budget Breakdown</h5>
      <div className="budget-items">
        {Object.entries(plan.resourcePlan.budget.breakdown).map(([category, amount]) => (
          <div key={category} className="budget-item">
            <span className="category">{category}</span>
            <span className="amount">${amount.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const RiskRegister: React.FC<{ risks: GeneratedProjectPlan['riskRegister'] }> = ({ risks }) => (
  <div className="risk-register">
    <h4>Risk Register</h4>
    <div className="risks-grid">
      {risks.map(risk => (
        <div key={risk.id} className={`risk-card risk-${risk.impact}`}>
          <div className="risk-header">
            <h5>{risk.risk}</h5>
            <div className="risk-indicators">
              <span className={`impact impact-${risk.impact}`}>{risk.impact}</span>
              <span className={`probability probability-${risk.probability}`}>{risk.probability}</span>
            </div>
          </div>
          <p className="risk-mitigation">{risk.mitigation}</p>
          <span className="risk-owner">Owner: {risk.owner}</span>
        </div>
      ))}
    </div>
  </div>
);

export const ProjectPlanResults: React.FC<{
  plan: GeneratedProjectPlan;
  methodology: string;
}> = ({ plan, methodology }) => {
  const [activeView, setActiveView] = useState('overview');
  const [refinementRequest, setRefinementRequest] = useState('');

  const views = [
    { id: 'overview', label: 'Overview' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'resources', label: 'Resources' },
    { id: 'risks', label: 'Risk Register' }
  ];

  const handleRefinePlan = async () => {
    try {
      await brdApi.refinePlan(plan.id, { refinementRequest });
      // Refresh plan data
      setRefinementRequest('');
    } catch (error) {
      console.error('Refinement failed:', error);
    }
  };

  const handleCreateProject = async () => {
    try {
      const project = await brdApi.createProjectFromPlan(plan.id, {
        projectName: `Project from ${plan.methodology} Plan`,
        startDate: new Date().toISOString()
      });
      // Navigate to project
      console.log('Project created:', project);
    } catch (error) {
      console.error('Project creation failed:', error);
    }
  };

  return (
    <div className="project-plan-results">
      <div className="plan-header">
        <h3>Generated {methodology} Project Plan</h3>
        <div className="plan-metadata">
          <span>Confidence: {Math.round(plan.generationMetadata.confidence * 100)}%</span>
          <span>Tasks: {plan.planStructure.tasks.length}</span>
          <span>Duration: {plan.resourcePlan.timeline.duration}</span>
        </div>
      </div>

      <div className="plan-actions">
        <div className="refinement-section">
          <textarea
            value={refinementRequest}
            onChange={(e) => setRefinementRequest(e.target.value)}
            placeholder="Request plan modifications (e.g., 'Add more testing phases', 'Reduce timeline by 2 weeks')"
            className="refinement-input"
          />
          <button
            onClick={handleRefinePlan}
            disabled={!refinementRequest.trim()}
            className="refine-button"
          >
            Refine Plan
          </button>
        </div>

        <button
          onClick={handleCreateProject}
          className="create-project-button"
        >
          Create Project from Plan
        </button>
      </div>

      <div className="plan-views">
        <div className="view-nav">
          {views.map(view => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`view-button ${activeView === view.id ? 'active' : ''}`}
            >
              {view.label}
            </button>
          ))}
        </div>

        <div className="view-content">
          {activeView === 'overview' && <PlanOverview plan={plan} />}
          {activeView === 'timeline' && <PlanTimeline plan={plan} methodology={methodology} />}
          {activeView === 'resources' && <ResourcePlan plan={plan} />}
          {activeView === 'risks' && <RiskRegister risks={plan.riskRegister} />}
        </div>
      </div>
    </div>
  );
};
