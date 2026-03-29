import { useMemo, useState } from 'react';
import { Layers, Search } from 'lucide-react';
import type { TemplateLike } from '../lib/templateGalleryModel';
import { toGalleryCardModel } from '../lib/templateGalleryModel';
import { getUiGroup, groupLabels, groupOrder, type UiGroup } from '../lib/categoryMapping';
import { TemplateCard } from './TemplateCard';

interface TemplateGalleryProps {
  templates: TemplateLike[];
  onSelect: (template: TemplateLike) => void;
  onPreview: (template: TemplateLike) => void;
  searchPlaceholder?: string;
  loading?: boolean;
}

export function TemplateGallery({
  templates,
  onSelect,
  onPreview,
  searchPlaceholder = 'Search templates…',
  loading = false,
}: TemplateGalleryProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<UiGroup | 'all'>('all');

  const groupedTemplates = useMemo(() => {
    const filtered = templates.filter((t) => {
      const matchesSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        activeCategory === 'all' || getUiGroup(t) === activeCategory;

      return matchesSearch && matchesCategory;
    });

    const groups: Record<UiGroup, TemplateLike[]> = {
      'quick-start': [],
      methodology: [],
      'by-use-case': [],
      custom: [],
    };

    filtered.forEach((t) => {
      groups[getUiGroup(t)].push(t);
    });

    return groups;
  }, [templates, search, activeCategory]);

  const hasResults = Object.values(groupedTemplates).some((g) => g.length > 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="sticky top-0 z-10 mb-6 border-b border-slate-200 bg-white pb-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Templates
          </button>
          {groupOrder.map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setActiveCategory(group)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === group
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {groupLabels[group].title}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-500">
            Loading templates…
          </div>
        ) : hasResults ? (
          groupOrder.map((group) => {
            const groupTemplates = groupedTemplates[group];
            if (activeCategory !== 'all' && activeCategory !== group) return null;
            if (groupTemplates.length === 0) return null;

            return (
              <section key={group}>
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {groupLabels[group].title}
                  </h3>
                  <p className="text-sm text-slate-500">{groupLabels[group].subtitle}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {groupTemplates.map((t, index) => (
                    <div
                      key={t.id}
                      style={{ animationDelay: `${index * 50}ms` }}
                      className="animate-fade-in-up"
                    >
                      <TemplateCard
                        template={toGalleryCardModel(t)}
                        onPreview={() => onPreview(t)}
                        onUse={() => onSelect(t)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <div className="py-12 text-center text-slate-500">
            <Layers className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="mb-2 text-lg font-medium">No templates found</p>
            <p className="text-sm">Try adjusting your search or category filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
