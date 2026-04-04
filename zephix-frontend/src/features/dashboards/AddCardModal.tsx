import { useState } from "react";
import { X } from "lucide-react";
import { widgetRegistry, getWidgetsByCategory } from "./widget-registry";
import type { WidgetType } from "./types";

interface AddCardModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (widgetType: WidgetType) => void;
}

/**
 * Pass 3: Add Card modal — real widget selection from the widget registry.
 * Modal-based per locked spec. Every visible category and tile is backed by
 * a real widget type in the registry.
 */
export function AddCardModal({ open, onClose, onSelect }: AddCardModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categories = getWidgetsByCategory();
  const categoryNames = Object.keys(categories);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-testid="add-card-modal">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Add Card</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              data-testid="add-card-close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 border-b border-slate-200 px-6">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-2.5 text-xs font-medium transition ${
                selectedCategory === null
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              All
            </button>
            {categoryNames.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-2.5 text-xs font-medium transition ${
                  selectedCategory === cat
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                data-testid={`card-category-${cat.toLowerCase()}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Widget tiles */}
          <div className="max-h-80 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              {categoryNames
                .filter((cat) => !selectedCategory || cat === selectedCategory)
                .flatMap((cat) =>
                  categories[cat].map((type) => {
                    const entry = widgetRegistry[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          onSelect(type);
                          onClose();
                        }}
                        className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:shadow-sm"
                        data-testid={`card-tile-${type}`}
                      >
                        <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                          {entry.category}
                        </div>
                        <div className="mt-1 text-sm font-medium text-slate-900">
                          {entry.displayName}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                          {entry.description}
                        </div>
                      </button>
                    );
                  })
                )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 px-6 py-3">
            <p className="text-xs text-slate-400">
              Cards inherit the dashboard source scope. Data populates as project data becomes available.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
