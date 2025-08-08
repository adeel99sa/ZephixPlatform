import React, { useState } from 'react';
import { Edit, Save, X, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';

interface CharterViewProps {
  charter: any;
  onUpdate: (updates: any) => void;
  recommendations: any;
}

const CharterView: React.FC<CharterViewProps> = ({ charter, onUpdate, recommendations }) => {
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

  const handleEdit = (field: string, currentValue: any) => {
    setEditing(field);
    setEditValues({ [field]: currentValue });
  };

  const handleSave = (field: string) => {
    onUpdate({ [field]: editValues[field] });
    setEditing(null);
    setEditValues({});
  };

  const handleCancel = () => {
    setEditing(null);
    setEditValues({});
  };

  const renderEditableField = (field: string, label: string, value: any, type: 'text' | 'textarea' | 'array' = 'text') => {
    const isEditing = editing === field;

    if (isEditing) {
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          {type === 'textarea' ? (
            <textarea
              value={editValues[field] || ''}
              onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          ) : type === 'array' ? (
            <div className="space-y-2">
              {(editValues[field] || value || []).map((item: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const newArray = [...(editValues[field] || value || [])];
                      newArray[index] = e.target.value;
                      setEditValues({ ...editValues, [field]: newArray });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => {
                      const newArray = (editValues[field] || value || []).filter((_: any, i: number) => i !== index);
                      setEditValues({ ...editValues, [field]: newArray });
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newArray = [...(editValues[field] || value || []), ''];
                  setEditValues({ ...editValues, [field]: newArray });
                }}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                + Add item
              </button>
            </div>
          ) : (
            <input
              type="text"
              value={editValues[field] || ''}
              onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
          <div className="flex space-x-2">
            <button
              onClick={() => handleSave(field)}
              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          <button
            onClick={() => handleEdit(field, value)}
            className="text-indigo-600 hover:text-indigo-800"
          >
            <Edit className="h-4 w-4" />
          </button>
        </div>
        <div className="text-sm text-gray-900">
          {type === 'array' ? (
            <ul className="list-disc list-inside space-y-1">
              {(value || []).map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="whitespace-pre-wrap">{value || 'Not specified'}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Project Charter</h2>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm text-green-600 font-medium">AI Generated</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            {renderEditableField('projectTitle', 'Project Title', charter.projectTitle)}
            {renderEditableField('businessCase', 'Business Case', charter.businessCase, 'textarea')}
            {renderEditableField('projectObjectives', 'Project Objectives', charter.projectObjectives, 'array')}
            {renderEditableField('successCriteria', 'Success Criteria', charter.successCriteria, 'array')}
          </div>

          {/* Scope and Constraints */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scope</label>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700">Included:</span>
                  <ul className="list-disc list-inside text-sm text-gray-900 mt-1">
                    {(charter.scope?.included || []).map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Excluded:</span>
                  <ul className="list-disc list-inside text-sm text-gray-900 mt-1">
                    {(charter.scope?.excluded || []).map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {renderEditableField('assumptions', 'Assumptions', charter.assumptions, 'array')}
            {renderEditableField('constraints', 'Constraints', charter.constraints, 'array')}
          </div>
        </div>
      </div>

      {/* Timeline and Budget */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline & Budget</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timeline</label>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-700">Start Date:</span>
                <p className="text-sm text-gray-900">{charter.highLevelTimeline?.startDate || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">End Date:</span>
                <p className="text-sm text-gray-900">{charter.highLevelTimeline?.endDate || 'Not specified'}</p>
              </div>
            </div>

            {charter.highLevelTimeline?.majorMilestones && (
              <div className="mt-4">
                <span className="text-sm font-medium text-gray-700">Major Milestones:</span>
                <div className="mt-2 space-y-2">
                  {charter.highLevelTimeline.majorMilestones.map((milestone: any, index: number) => (
                    <div key={index} className="bg-gray-50 rounded p-2">
                      <div className="font-medium text-sm">{milestone.name}</div>
                      <div className="text-xs text-gray-600">{milestone.date}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Deliverables: {milestone.deliverables?.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Budget Estimate</label>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-700">Range:</span>
                <p className="text-sm text-gray-900">{charter.budgetEstimate?.range || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Confidence:</span>
                <p className="text-sm text-gray-900 capitalize">{charter.budgetEstimate?.confidence || 'Not specified'}</p>
              </div>
            </div>

            {charter.budgetEstimate?.breakdown && (
              <div className="mt-4">
                <span className="text-sm font-medium text-gray-700">Budget Breakdown:</span>
                <div className="mt-2 space-y-1">
                  {charter.budgetEstimate.breakdown.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.category}</span>
                      <span>{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      {recommendations && (
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Lightbulb className="h-5 w-5 text-blue-500 mr-2" />
            <h3 className="text-lg font-semibold text-blue-900">AI Recommendations</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-blue-800">Recommended Methodology:</span>
              <p className="text-sm text-blue-900 font-medium capitalize">{recommendations.methodology}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-blue-800">Recommended Team Size:</span>
              <p className="text-sm text-blue-900 font-medium">{recommendations.teamSize}</p>
            </div>
          </div>

          {recommendations.criticalSuccessFactors && (
            <div className="mt-4">
              <span className="text-sm font-medium text-blue-800">Critical Success Factors:</span>
              <ul className="list-disc list-inside text-sm text-blue-900 mt-1">
                {recommendations.criticalSuccessFactors.map((factor: string, index: number) => (
                  <li key={index}>{factor}</li>
                ))}
              </ul>
            </div>
          )}

          {recommendations.governanceStructure && (
            <div className="mt-4">
              <span className="text-sm font-medium text-blue-800">Governance Structure:</span>
              <p className="text-sm text-blue-900 mt-1">{recommendations.governanceStructure}</p>
            </div>
          )}

          {recommendations.communicationPlan && (
            <div className="mt-4">
              <span className="text-sm font-medium text-blue-800">Communication Strategy:</span>
              <p className="text-sm text-blue-900 mt-1">{recommendations.communicationPlan}</p>
            </div>
          )}
        </div>
      )}

      {/* Project Team */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Team</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project Manager</label>
            <p className="text-sm text-gray-900">{charter.projectManager || 'To be assigned'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project Sponsor</label>
            <p className="text-sm text-gray-900">{charter.sponsor || 'To be assigned'}</p>
          </div>
        </div>

        {charter.approvalCriteria && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Approval Criteria</label>
            <ul className="list-disc list-inside text-sm text-gray-900">
              {charter.approvalCriteria.map((criterion: string, index: number) => (
                <li key={index}>{criterion}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharterView;
