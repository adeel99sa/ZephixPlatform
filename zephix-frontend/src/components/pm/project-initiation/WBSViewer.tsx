import React, { useState } from 'react';
import { Target, ChevronDown, ChevronRight, Package, FileText, Link } from 'lucide-react';

interface WBSViewerProps {
  wbsStructure: any;
  onUpdate: (wbsStructure: any) => void;
}

const WBSViewer: React.FC<WBSViewerProps> = ({ wbsStructure, onUpdate }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('structure');

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const renderWBSItem = (item: any, level: number = 0, parentId: string = '') => {
    const itemId = `${parentId}-${item.name}`;
    const isExpanded = expandedItems.has(itemId);
    const hasChildren = item.level2 && item.level2.length > 0;

    return (
      <div key={itemId} className="border-l-2 border-gray-200 ml-4">
        <div className="flex items-center py-2 hover:bg-gray-50">
          <div className="flex items-center flex-1">
            {hasChildren && (
              <button
                onClick={() => toggleExpanded(itemId)}
                className="p-1 hover:bg-gray-200 rounded mr-2"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-6 mr-2" />}
            
            <div className="flex items-center">
              <Package className="h-4 w-4 text-indigo-500 mr-2" />
              <div>
                <h4 className="font-medium text-gray-900">{item.name}</h4>
                {item.description && (
                  <p className="text-sm text-gray-600">{item.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="ml-6">
            {item.level2.map((subItem: any, index: number) => (
              <div key={`${itemId}-${index}`} className="border-l-2 border-gray-200 ml-4">
                <div className="flex items-center py-2 hover:bg-gray-50">
                  <div className="flex items-center flex-1">
                    <Target className="h-4 w-4 text-green-500 mr-2" />
                    <div>
                      <h5 className="font-medium text-gray-900">{subItem.name}</h5>
                      {subItem.description && (
                        <p className="text-sm text-gray-600">{subItem.description}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Deliverables */}
                {subItem.deliverables && subItem.deliverables.length > 0 && (
                  <div className="ml-6 mb-2">
                    <div className="flex items-center mb-1">
                      <FileText className="h-3 w-3 text-blue-500 mr-1" />
                      <span className="text-xs font-medium text-gray-700">Deliverables:</span>
                    </div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {subItem.deliverables.map((deliverable: string, delIndex: number) => (
                        <li key={delIndex} className="ml-4">• {deliverable}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Dependencies */}
                {subItem.dependencies && subItem.dependencies.length > 0 && (
                  <div className="ml-6 mb-2">
                    <div className="flex items-center mb-1">
                      <Link className="h-3 w-3 text-orange-500 mr-1" />
                      <span className="text-xs font-medium text-gray-700">Dependencies:</span>
                    </div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {subItem.dependencies.map((dependency: string, depIndex: number) => (
                        <li key={depIndex} className="ml-4">• {dependency}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderWBSStructure = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Breakdown Structure</h3>
        
        <div className="space-y-2">
          {(wbsStructure?.level1 || []).map((item: any, index: number) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              {renderWBSItem(item, 0, `level1-${index}`)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderWBSStats = () => {
    const stats = {
      totalLevel1: wbsStructure?.level1?.length || 0,
      totalLevel2: 0,
      totalDeliverables: 0,
      totalDependencies: 0,
    };

    // Calculate stats
    (wbsStructure?.level1 || []).forEach((level1Item: any) => {
      if (level1Item.level2) {
        stats.totalLevel2 += level1Item.level2.length;
        level1Item.level2.forEach((level2Item: any) => {
          if (level2Item.deliverables) {
            stats.totalDeliverables += level2Item.deliverables.length;
          }
          if (level2Item.dependencies) {
            stats.totalDependencies += level2Item.dependencies.length;
          }
        });
      }
    });

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">WBS Statistics</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalLevel1}</div>
              <div className="text-sm text-blue-600">Level 1 Items</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalLevel2}</div>
              <div className="text-sm text-green-600">Level 2 Items</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.totalDeliverables}</div>
              <div className="text-sm text-purple-600">Deliverables</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.totalDependencies}</div>
              <div className="text-sm text-orange-600">Dependencies</div>
            </div>
          </div>
        </div>

        {/* Deliverables Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Deliverables Summary</h3>
          
          <div className="space-y-3">
            {(wbsStructure?.level1 || []).map((level1Item: any, level1Index: number) => (
              <div key={level1Index} className="border border-gray-200 rounded-lg p-3">
                <h4 className="font-medium text-gray-900 mb-2">{level1Item.name}</h4>
                <div className="space-y-2">
                  {(level1Item.level2 || []).map((level2Item: any, level2Index: number) => (
                    <div key={level2Index} className="ml-4">
                      <h5 className="text-sm font-medium text-gray-700">{level2Item.name}</h5>
                      {level2Item.deliverables && level2Item.deliverables.length > 0 && (
                        <ul className="text-xs text-gray-600 mt-1 space-y-1">
                          {level2Item.deliverables.map((deliverable: string, delIndex: number) => (
                            <li key={delIndex} className="ml-4">• {deliverable}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dependencies Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dependencies Summary</h3>
          
          <div className="space-y-3">
            {(wbsStructure?.level1 || []).map((level1Item: any, level1Index: number) => (
              <div key={level1Index} className="border border-gray-200 rounded-lg p-3">
                <h4 className="font-medium text-gray-900 mb-2">{level1Item.name}</h4>
                <div className="space-y-2">
                  {(level1Item.level2 || []).map((level2Item: any, level2Index: number) => (
                    <div key={level2Index} className="ml-4">
                      <h5 className="text-sm font-medium text-gray-700">{level2Item.name}</h5>
                      {level2Item.dependencies && level2Item.dependencies.length > 0 && (
                        <ul className="text-xs text-gray-600 mt-1 space-y-1">
                          {level2Item.dependencies.map((dependency: string, depIndex: number) => (
                            <li key={depIndex} className="ml-4">• {dependency}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
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
          <h2 className="text-xl font-semibold text-gray-900">Work Breakdown Structure</h2>
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-purple-500" />
            <span className="text-sm text-purple-600 font-medium">
              {wbsStructure?.level1?.length || 0} Major Components
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'structure', label: 'WBS Structure', icon: Target },
              { id: 'stats', label: 'Statistics', icon: Package },
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
        {activeTab === 'structure' && renderWBSStructure()}
        {activeTab === 'stats' && renderWBSStats()}
      </div>
    </div>
  );
};

export default WBSViewer;
