/**
 * Insight Center — curated card library modal for workspace dashboards.
 * Pass 2: browse categories, search, add insight cards to the dashboard.
 * No card settings, no resize, no drag-drop.
 */
import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Search, Sparkles, Check } from "lucide-react";
import {
  getAddableCards,
  CATEGORIES,
  CATEGORY_LABELS,
  type InsightCategory,
  type CardDefinition,
} from "./card-registry";

interface InsightCenterModalProps {
  open: boolean;
  onClose: () => void;
  /** IDs of cards already on the dashboard (default + added) */
  existingCardIds: Set<string>;
  /** Callback when user adds a card */
  onAddCard: (cardId: string) => void;
}

export function InsightCenterModal({
  open,
  onClose,
  existingCardIds,
  onAddCard,
}: InsightCenterModalProps) {
  const [activeCategory, setActiveCategory] = useState<InsightCategory | "all">("all");
  const [search, setSearch] = useState("");

  const addableCards = useMemo(() => getAddableCards(), []);

  const filteredCards = useMemo(() => {
    let cards = addableCards;

    if (activeCategory !== "all") {
      cards = cards.filter((c) => c.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      cards = cards.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q),
      );
    }

    return cards;
  }, [addableCards, activeCategory, search]);

  const allAdded = addableCards.every((c) => existingCardIds.has(c.id));

  if (!open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[5000] bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[5001] m-auto flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        style={{
          width: "min(92vw, 720px)",
          height: "min(88vh, 640px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Insight Center</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-slate-100 px-6 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search insights..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Category chips */}
        <div className="flex items-center gap-1.5 border-b border-slate-100 px-6 py-2.5 overflow-x-auto">
          <CategoryChip
            label="All"
            active={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
          />
          {CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              label={CATEGORY_LABELS[cat]}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
            />
          ))}
        </div>

        {/* Card library */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {allAdded && activeCategory === "all" && !search.trim() ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-center text-sm text-slate-400">
                All available insights have already been added to this workspace dashboard.
              </p>
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-center text-sm text-slate-400">No matching insights found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredCards.map((card) => {
                const alreadyAdded = existingCardIds.has(card.id);
                return (
                  <InsightOption
                    key={card.id}
                    card={card}
                    alreadyAdded={alreadyAdded}
                    onAdd={() => onAddCard(card.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

/* ── Sub-components ── */

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
        active
          ? "bg-blue-100 text-blue-700"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function InsightOption({
  card,
  alreadyAdded,
  onAdd,
}: {
  card: CardDefinition;
  alreadyAdded: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:shadow-sm">
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold text-slate-800">{card.title}</h4>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{card.description}</p>
        <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          {CATEGORY_LABELS[card.category]}
        </span>
      </div>
      {alreadyAdded ? (
        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-600">
          <Check className="h-3 w-3" />
          Added
        </span>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
        >
          Add
        </button>
      )}
    </div>
  );
}
