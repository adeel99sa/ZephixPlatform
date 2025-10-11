import React, { useState } from 'react';
import { api } from '../../../services/api';

interface PolicySettings {
  warningThreshold: number;
  requireJustificationAt: number;
  requireApprovalAt: number;
  maxAllocation: number;
}

export const ResourcePolicy: React.FC = () => {
  const [policy, setPolicy] = useState<PolicySettings>({
    warningThreshold: 80,
    requireJustificationAt: 100,
    requireApprovalAt: 120,
    maxAllocation: 150,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const savePolicy = async () => {
    setLoading(true);
    try {
      await api.put('/admin/resource-policy', policy);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const PolicySlider: React.FC<{
    label: string;
    value: number;
    onChange: (value: number) => void;
    description: string;
    min?: number;
    max?: number;
  }> = ({ label, value, onChange, description, min = 0, max = 200 }) => (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-bold text-blue-600">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
      />
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Resource Allocation Policy</h1>
        <p className="mt-2 text-gray-600">
          Configure flexible allocation thresholds and approval workflows
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-8">
          <PolicySlider
            label="Warning Threshold"
            value={policy.warningThreshold}
            onChange={(v) => setPolicy({ ...policy, warningThreshold: v })}
            description="Show warning when resource allocation exceeds this percentage"
            min={50}
            max={120}
          />

          <PolicySlider
            label="Require Justification"
            value={policy.requireJustificationAt}
            onChange={(v) => setPolicy({ ...policy, requireJustificationAt: v })}
            description="Require justification note when exceeding this threshold"
            min={80}
            max={150}
          />

          <PolicySlider
            label="Require Approval"
            value={policy.requireApprovalAt}
            onChange={(v) => setPolicy({ ...policy, requireApprovalAt: v })}
            description="Require admin approval above this threshold"
            min={100}
            max={180}
          />

          <PolicySlider
            label="Maximum Allocation"
            value={policy.maxAllocation}
            onChange={(v) => setPolicy({ ...policy, maxAllocation: v })}
            description="Hard limit - cannot exceed this percentage"
            min={120}
            max={200}
          />
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Changes will apply to all new resource allocations
            </div>
            <div className="flex items-center space-x-3">
              {saved && (
                <span className="text-sm text-green-600 font-medium">
                  ✓ Policy saved successfully
                </span>
              )}
              <button
                onClick={savePolicy}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Policy'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Policy Preview */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Policy Preview</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <span>Warning shown at {policy.warningThreshold}% allocation</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
            <span>Justification required at {policy.requireJustificationAt}% allocation</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <span>Approval required at {policy.requireApprovalAt}% allocation</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span>Hard limit at {policy.maxAllocation}% allocation</span>
          </div>
        </div>
      </div>
    </div>
  );
};
