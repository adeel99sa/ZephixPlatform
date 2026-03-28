/**
 * ViewSettingsPanel — UX Step 3
 *
 * Slide-out panel for configuring a view's visible fields.
 * Core fields are locked (always visible). Optional fields can be toggled.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Settings2, Lock, Eye, EyeOff, X } from 'lucide-react';
import {
  CORE_TASK_FIELDS,
  OPTIONAL_TASK_FIELDS,
  type TaskFieldDef,
} from './TaskFieldRegistry';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  /** Currently visible field keys */
  visibleFields: string[];
  /** Callback when fields change */
  onFieldsChange: (fields: string[]) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const ViewSettingsPanel: React.FC<Props> = ({
  visibleFields,
  onFieldsChange,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const toggleField = (key: string) => {
    if (visibleFields.includes(key)) {
      onFieldsChange(visibleFields.filter((k) => k !== key));
    } else {
      onFieldsChange([...visibleFields, key]);
    }
  };

  return (
    <div className={`relative ${className ?? ''}`} ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors
          ${open
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
        `}
        title="View fields"
      >
        <Settings2 className="h-3.5 w-3.5" />
        Fields
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Visible Fields
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="py-1 max-h-80 overflow-y-auto">
            {/* Core fields — locked */}
            <div className="px-3 py-1.5">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Core (always visible)
              </span>
            </div>
            {CORE_TASK_FIELDS.map((field) => (
              <FieldRow key={field.key} field={field} locked />
            ))}

            {/* Separator */}
            <div className="border-t border-slate-100 my-1" />

            {/* Optional fields — toggleable */}
            <div className="px-3 py-1.5">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Optional
              </span>
            </div>
            {OPTIONAL_TASK_FIELDS.map((field) => (
              <FieldRow
                key={field.key}
                field={field}
                visible={visibleFields.includes(field.key)}
                onToggle={() => toggleField(field.key)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  FieldRow                                                           */
/* ------------------------------------------------------------------ */

function FieldRow({
  field,
  locked,
  visible,
  onToggle,
}: {
  field: TaskFieldDef;
  locked?: boolean;
  visible?: boolean;
  onToggle?: () => void;
}) {
  return (
    <button
      className={`
        w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors
        ${locked
          ? 'text-slate-500 cursor-default'
          : visible
            ? 'text-slate-800 hover:bg-slate-50 cursor-pointer'
            : 'text-slate-400 hover:bg-slate-50 cursor-pointer'}
      `}
      onClick={locked ? undefined : onToggle}
      disabled={locked}
    >
      {locked ? (
        <Lock className="h-3.5 w-3.5 text-slate-400" />
      ) : visible ? (
        <Eye className="h-3.5 w-3.5 text-indigo-500" />
      ) : (
        <EyeOff className="h-3.5 w-3.5 text-slate-300" />
      )}
      <span className="flex-1 text-left">{field.label}</span>
      {locked && (
        <span className="text-[10px] text-slate-400 font-medium">LOCKED</span>
      )}
    </button>
  );
}

export default ViewSettingsPanel;
