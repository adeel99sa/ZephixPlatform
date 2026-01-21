/**
 * Template KPI Defaults Selector
 * MVP: Hardcoded KPI list for template defaultEnabledKPIs
 */

import { useState } from 'react';

// MVP: Hardcoded KPI list
// TODO: Replace with API call to get available KPIs
const AVAILABLE_KPIS = [
  { id: 'schedule_variance', label: 'Schedule Variance', category: 'Delivery' },
  { id: 'budget_variance', label: 'Budget Variance', category: 'Cost' },
  { id: 'scope_creep', label: 'Scope Creep', category: 'Delivery' },
  { id: 'resource_utilization', label: 'Resource Utilization', category: 'Resource' },
  { id: 'quality_score', label: 'Quality Score', category: 'Quality' },
  { id: 'risk_count', label: 'Risk Count', category: 'Risk' },
  { id: 'blocked_tasks', label: 'Blocked Tasks', category: 'Delivery' },
  { id: 'overdue_tasks', label: 'Overdue Tasks', category: 'Delivery' },
  { id: 'cycle_time', label: 'Cycle Time', category: 'Delivery' },
  { id: 'throughput', label: 'Throughput', category: 'Delivery' },
];

interface TemplateKpiSelectorProps {
  selectedKpiIds: string[];
  onChange: (kpiIds: string[]) => void;
}

export function TemplateKpiSelector({ selectedKpiIds, onChange }: TemplateKpiSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredKpis = AVAILABLE_KPIS.filter((kpi) =>
    kpi.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kpi.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleKpi = (kpiId: string) => {
    if (selectedKpiIds.includes(kpiId)) {
      onChange(selectedKpiIds.filter((id) => id !== kpiId));
    } else {
      onChange([...selectedKpiIds, kpiId]);
    }
  };

  // Group by category
  const kpisByCategory = filteredKpis.reduce((acc, kpi) => {
    if (!acc[kpi.category]) {
      acc[kpi.category] = [];
    }
    acc[kpi.category].push(kpi);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_KPIS>);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search KPIs..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Selected Count */}
      {selectedKpiIds.length > 0 && (
        <div className="text-sm text-gray-600">
          {selectedKpiIds.length} KPI{selectedKpiIds.length !== 1 ? 's' : ''} selected
        </div>
      )}

      {/* KPI List by Category */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {Object.entries(kpisByCategory).map(([category, kpis]) => (
          <div key={category}>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">{category}</h4>
            <div className="space-y-2">
              {kpis.map((kpi) => {
                const isSelected = selectedKpiIds.includes(kpi.id);
                return (
                  <label
                    key={kpi.id}
                    className="flex items-center p-2 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleKpi(kpi.id)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-900">{kpi.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {filteredKpis.length === 0 && (
        <div className="text-sm text-gray-500 text-center py-4">
          No KPIs found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
}
