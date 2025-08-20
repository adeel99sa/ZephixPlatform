import React from 'react';
import { Toggle } from '../shared/Toggle';

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  warning?: string;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  warning
}) => {
  return (
    <div className="space-y-3">
      <Toggle
        enabled={checked}
        onChange={onChange}
        label={label}
        description={description}
        disabled={disabled}
      />
      
      {warning && (
        <div className="ml-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-sm text-yellow-800">{warning}</p>
          </div>
        </div>
      )}
    </div>
  );
};

