import React, { useState } from 'react';

interface BRDEditorPanelProps {
  brdData: any;
  isEditing: boolean;
  onUpdate: (updatedBRD: any) => void;
  onChunkSelect: (chunkId: string) => void;
  selectedChunkId: string | null;
}

export const BRDEditorPanel: React.FC<BRDEditorPanelProps> = ({
  brdData,
  isEditing,
  onUpdate,
  onChunkSelect,
  selectedChunkId,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['metadata', 'businessContext']));

  const toggleSection = (sectionName: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName);
    } else {
      newExpanded.add(sectionName);
    }
    setExpandedSections(newExpanded);
  };

  const updateBRDField = (section: string, field: string, value: any) => {
    if (!isEditing) return;
    
    const updatedBRD = { ...brdData };
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updatedBRD[section][parent][child] = value;
    } else {
      updatedBRD[section][field] = value;
    }
    onUpdate(updatedBRD);
  };

  const addArrayItem = (section: string, field: string, newItem: any) => {
    if (!isEditing) return;
    
    const updatedBRD = { ...brdData };
    if (!updatedBRD[section][field]) {
      updatedBRD[section][field] = [];
    }
    updatedBRD[section][field].push(newItem);
    onUpdate(updatedBRD);
  };

  const removeArrayItem = (section: string, field: string, index: number) => {
    if (!isEditing) return;
    
    const updatedBRD = { ...brdData };
    updatedBRD[section][field].splice(index, 1);
    onUpdate(updatedBRD);
  };

  const renderMetadataSection = () => (
    <div className="brd-section">
      <div 
        className="section-header cursor-pointer"
        onClick={() => toggleSection('metadata')}
      >
        <h4 className="text-lg font-medium text-gray-900">📋 Document Metadata</h4>
        <span className="text-gray-500">
          {expandedSections.has('metadata') ? '▼' : '▶'}
        </span>
      </div>
      
      {expandedSections.has('metadata') && (
        <div className="section-content space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Title
            </label>
            {isEditing ? (
              <input
                type="text"
                value={brdData.metadata.title || ''}
                onChange={(e) => updateBRDField('metadata', 'title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter document title"
              />
            ) : (
              <p className="text-gray-900">{brdData.metadata.title || 'No title specified'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Summary
            </label>
            {isEditing ? (
              <textarea
                value={brdData.metadata.summary || ''}
                onChange={(e) => updateBRDField('metadata', 'summary', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter document summary"
              />
            ) : (
              <p className="text-gray-900">{brdData.metadata.summary || 'No summary provided'}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={brdData.metadata.department || ''}
                  onChange={(e) => updateBRDField('metadata', 'department', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Product, Engineering"
                />
              ) : (
                <p className="text-gray-900">{brdData.metadata.department || 'Not specified'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Industry
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={brdData.metadata.industry || ''}
                  onChange={(e) => updateBRDField('metadata', 'industry', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Technology, Healthcare"
                />
              ) : (
                <p className="text-gray-900">{brdData.metadata.industry || 'Not specified'}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderBusinessContextSection = () => (
    <div className="brd-section">
      <div 
        className="section-header cursor-pointer"
        onClick={() => toggleSection('businessContext')}
      >
        <h4 className="text-lg font-medium text-gray-900">🎯 Business Context</h4>
        <span className="text-gray-500">
          {expandedSections.has('businessContext') ? '▼' : '▶'}
        </span>
      </div>
      
      {expandedSections.has('businessContext') && (
        <div className="section-content space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Problem Statement
            </label>
            {isEditing ? (
              <textarea
                value={brdData.businessContext.problemStatement || ''}
                onChange={(e) => updateBRDField('businessContext', 'problemStatement', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe the business problem or opportunity"
              />
            ) : (
              <p className="text-gray-900">{brdData.businessContext.problemStatement || 'No problem statement provided'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Objective
            </label>
            {isEditing ? (
              <textarea
                value={brdData.businessContext.businessObjective || ''}
                onChange={(e) => updateBRDField('businessContext', 'businessObjective', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe the business objective"
              />
            ) : (
              <p className="text-gray-900">{brdData.businessContext.businessObjective || 'No business objective provided'}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderFunctionalRequirementsSection = () => (
    <div className="brd-section">
      <div 
        className="section-header cursor-pointer"
        onClick={() => toggleSection('functionalRequirements')}
      >
        <h4 className="text-lg font-medium text-gray-900">⚙️ Functional Requirements</h4>
        <span className="text-gray-500">
          {expandedSections.has('functionalRequirements') ? '▼' : '▶'}
        </span>
      </div>
      
      {expandedSections.has('functionalRequirements') && (
        <div className="section-content">
          {brdData.functionalRequirements.length === 0 ? (
            <p className="text-gray-500 italic">No functional requirements identified yet</p>
          ) : (
            <div className="space-y-3">
              {brdData.functionalRequirements.map((req: any, index: number) => (
                <div key={req.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-blue-600">{req.id}</span>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        req.priority === 'Must Have' ? 'bg-red-100 text-red-800' :
                        req.priority === 'Should Have' ? 'bg-orange-100 text-orange-800' :
                        req.priority === 'Could Have' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {req.priority}
                      </span>
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                        {req.category}
                      </span>
                    </div>
                  </div>
                  
                  <h5 className="font-medium text-gray-900 mb-1">{req.title}</h5>
                  <p className="text-sm text-gray-700 mb-2">{req.description}</p>
                  
                  {req.sourceChunkId && (
                    <button
                      onClick={() => onChunkSelect(req.sourceChunkId)}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      View source in document
                    </button>
                  )}
                  
                  {isEditing && (
                    <button
                      onClick={() => removeArrayItem('functionalRequirements', 'functionalRequirements', index)}
                      className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Remove requirement
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {isEditing && (
            <button
              onClick={() => addArrayItem('functionalRequirements', 'functionalRequirements', {
                id: `FR-${String(brdData.functionalRequirements.length + 1).padStart(3, '0')}`,
                title: 'New Requirement',
                description: 'Enter requirement description',
                priority: 'Must Have',
                category: 'General',
                acceptanceCriteria: [],
                sourceChunkId: null,
              })}
              className="mt-3 w-full px-3 py-2 border border-gray-300 border-dashed rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
            >
              + Add Functional Requirement
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderScopeSection = () => (
    <div className="brd-section">
      <div 
        className="section-header cursor-pointer"
        onClick={() => toggleSection('scope')}
      >
        <h4 className="text-lg font-medium text-gray-900">🎯 Project Scope</h4>
        <span className="text-gray-500">
          {expandedSections.has('scope') ? '▼' : '▶'}
        </span>
      </div>
      
      {expandedSections.has('scope') && (
        <div className="section-content space-y-4">
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">In Scope</h5>
            {brdData.scope.inScope.length === 0 ? (
              <p className="text-gray-500 italic text-sm">No in-scope items defined</p>
            ) : (
              <ul className="space-y-1">
                {brdData.scope.inScope.map((item: string, index: number) => (
                  <li key={index} className="flex items-center space-x-2">
                    <span className="text-green-500">✓</span>
                    <span className="text-sm text-gray-700">{item}</span>
                    {isEditing && (
                      <button
                        onClick={() => removeArrayItem('scope', 'inScope', index)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {isEditing && (
              <button
                onClick={() => addArrayItem('scope', 'inScope', 'New in-scope item')}
                className="mt-2 text-xs text-green-600 hover:text-green-800 underline"
              >
                + Add in-scope item
              </button>
            )}
          </div>

          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Out of Scope</h5>
            {brdData.scope.outOfScope.length === 0 ? (
              <p className="text-gray-500 italic text-sm">No out-of-scope items defined</p>
            ) : (
              <ul className="space-y-1">
                {brdData.scope.outOfScope.map((item: string, index: number) => (
                  <li key={index} className="flex items-center space-x-2">
                    <span className="text-red-500">✗</span>
                    <span className="text-sm text-gray-700">{item}</span>
                    {isEditing && (
                      <button
                        onClick={() => removeArrayItem('scope', 'outOfScope', index)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {isEditing && (
              <button
                onClick={() => addArrayItem('scope', 'outOfScope', 'New out-of-scope item')}
                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
              >
                + Add out-of-scope item
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="brd-editor-panel">
      {/* BRD Summary */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="text-sm font-medium text-green-800 mb-2">
          🧱 BRD Structure Summary
        </h4>
        <div className="grid grid-cols-2 gap-4 text-xs text-green-700">
          <div>
            <span className="font-medium">Requirements:</span> {brdData.functionalRequirements.length}
          </div>
          <div>
            <span className="font-medium">In Scope:</span> {brdData.scope.inScope.length}
          </div>
          <div>
            <span className="font-medium">Out of Scope:</span> {brdData.scope.outOfScope.length}
          </div>
          <div>
            <span className="font-medium">Status:</span> {isEditing ? 'Editing' : 'Preview'}
          </div>
        </div>
      </div>

      {/* BRD Sections */}
      <div className="space-y-4">
        {renderMetadataSection()}
        {renderBusinessContextSection()}
        {renderFunctionalRequirementsSection()}
        {renderScopeSection()}
      </div>

      {/* Editing Help */}
      {isEditing && (
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700 text-center">
            ✏️ You're in edit mode. Click on any field to modify the content. 
            Changes are automatically saved as you type.
          </p>
        </div>
      )}

      {/* Preview Help */}
      {!isEditing && (
        <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            👁️ You're in preview mode. Click "Edit Mode" to make changes to the BRD structure.
          </p>
        </div>
      )}
    </div>
  );
};
