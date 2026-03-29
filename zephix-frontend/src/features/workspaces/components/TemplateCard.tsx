import React from 'react';

export interface TemplateCardData {
  id: string;
  name: string;
  description: string;
  previewImage?: string;
  structure: {
    phases: number;
    tasks: number;
    views: string[];
  };
}

interface TemplateCardProps {
  template: TemplateCardData;
  onSelect: (template: TemplateCardData) => void;
}

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-left transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <div className="relative h-40 overflow-hidden bg-slate-100">
        {template.previewImage ? (
          <img
            src={template.previewImage}
            alt={template.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <span className="text-4xl text-slate-400">📋</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex gap-3 text-xs text-white">
            <span>{template.structure.phases} phases</span>
            <span>{template.structure.tasks} tasks</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h4 className="mb-1 text-base font-semibold text-slate-900">{template.name}</h4>
        <p className="mb-4 flex-1 text-sm text-slate-600 line-clamp-2">{template.description}</p>
        <span className="rounded bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors group-hover:bg-slate-200">
          Use Template
        </span>
      </div>
    </button>
  );
}
