import { useState } from 'react';
import { Button } from '@/components/ui/button/Button';
import { ArrowRight, CheckCircle2, Clock, Eye, Layers } from 'lucide-react';
import type { TemplateGalleryCardModel } from '../lib/templateGalleryModel';
import type { TemplatePresentationTier } from '../types';

interface TemplateCardProps {
  template: TemplateGalleryCardModel;
  onPreview: () => void;
  onUse: () => void;
}

const tierConfig: Record<
  TemplatePresentationTier,
  {
    color: string;
    bg: string;
    label: string;
    accent: string;
  }
> = {
  simple: {
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    label: 'Simple',
    accent: 'bg-emerald-500',
  },
  advanced: {
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    label: 'Advanced',
    accent: 'bg-blue-500',
  },
  enterprise: {
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    label: 'Enterprise',
    accent: 'bg-amber-500',
  },
};

function tierFromModel(template: TemplateGalleryCardModel): TemplatePresentationTier {
  if (template.presentationTier) return template.presentationTier;
  if (template.complexity === 'low') return 'simple';
  if (template.complexity === 'high') return 'enterprise';
  return 'advanced';
}

export function TemplateCard({ template, onPreview, onUse }: TemplateCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const tier = tierFromModel(template);
  const config = tierConfig[tier];

  const metaItems = [
    template.phaseCount > 0 ? `${template.phaseCount} phases` : null,
    template.taskCount > 0 ? `${template.taskCount} tasks` : null,
    template.estimatedSetupMinutes
      ? `~${template.estimatedSetupMinutes}m setup`
      : null,
  ].filter(Boolean) as string[];

  return (
    <div
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 ease-out hover:border-blue-300 hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`h-1.5 w-full ${config.accent}`} />

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-start justify-between">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-transform duration-300 ${config.bg} ${isHovered ? 'scale-110' : ''}`}
          >
            {template.icon || '📋'}
          </div>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${config.bg} ${config.color}`}
          >
            {config.label}
          </span>
        </div>

        <h3 className="mb-1 line-clamp-1 text-base font-semibold text-slate-900">
          {template.name}
        </h3>

        <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">
          {template.description}
        </p>

        {metaItems.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {metaItems.map((item, i) => (
              <span key={item} className="flex items-center gap-1 text-xs text-slate-500">
                {i === 0 ? (
                  <Layers className="h-3 w-3" />
                ) : i === metaItems.length - 1 && item.includes('setup') ? (
                  <Clock className="h-3 w-3" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {item}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="h-9 flex-1 text-slate-600 hover:text-slate-900"
            type="button"
          >
            <Eye className="mr-1.5 h-4 w-4" />
            Preview
          </Button>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onUse();
            }}
            className="h-9 flex-1 bg-blue-600 text-white hover:bg-blue-700"
            type="button"
          >
            Use
            <ArrowRight
              className={`ml-1.5 h-4 w-4 transition-transform ${isHovered ? 'translate-x-0.5' : ''}`}
            />
          </Button>
        </div>
      </div>
    </div>
  );
}
