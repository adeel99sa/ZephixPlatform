/**
 * GroupByControl — UX Step 4
 *
 * Dropdown control for selecting the groupBy field in a view.
 * Displays in the view toolbar.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Layers, X, Check } from 'lucide-react';
import { GROUPABLE_FIELDS, type TaskFieldDef } from './TaskFieldRegistry';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  /** Current groupBy value (null = no grouping) */
  value: string | null;
  /** Callback when groupBy changes */
  onChange: (groupBy: string | null) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const GroupByControl: React.FC<Props> = ({
  value,
  onChange,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const activeField = value
    ? GROUPABLE_FIELDS.find((f) => f.key === value || f.label.toLowerCase() === value.toLowerCase())
    : null;

  const handleSelect = (field: TaskFieldDef | null) => {
    onChange(field ? field.key : null);
    setOpen(false);
  };

  return (
    <div className={`relative ${className ?? ''}`} ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors
          ${value
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
        `}
        title="Group by"
      >
        <Layers className="h-3.5 w-3.5" />
        {activeField ? `Group: ${activeField.label}` : 'Group'}
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="ml-0.5 p-0.5 rounded hover:bg-indigo-200"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
          {/* No grouping option */}
          <button
            onClick={() => handleSelect(null)}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors
              ${!value ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}
            `}
          >
            {!value && <Check className="h-3.5 w-3.5" />}
            {value && <span className="w-3.5" />}
            <span>None</span>
          </button>

          <div className="border-t border-slate-100 my-1" />

          {GROUPABLE_FIELDS.map((field) => {
            const isActive = value === field.key;
            return (
              <button
                key={field.key}
                onClick={() => handleSelect(field)}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors
                  ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}
                `}
              >
                {isActive ? <Check className="h-3.5 w-3.5" /> : <span className="w-3.5" />}
                <span>{field.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GroupByControl;
