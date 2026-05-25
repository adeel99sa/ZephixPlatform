import { useState } from 'react';
import { Star } from 'lucide-react';

type RatingProps = {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  readOnly?: boolean;
  label?: string;
  error?: string;
};

/** Five-star rating control (Sprint 5.2a artifact custom fields). */
export function Rating({
  value,
  onChange,
  max = 5,
  readOnly = false,
  label = 'Rating',
  error,
}: RatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const committed = Math.max(0, Math.min(max, Math.round(value) || 0));
  const displayValue = hoverValue ?? committed;

  return (
    <div className="space-y-1">
      <div
        className="flex items-center gap-0.5"
        role="group"
        aria-label={label}
        onMouseLeave={() => setHoverValue(null)}
      >
        {Array.from({ length: max }, (_, i) => {
          const star = i + 1;
          const filled = star <= displayValue;
          return (
            <button
              key={star}
              type="button"
              disabled={readOnly}
              aria-label={`Rate ${star} of ${max}`}
              aria-pressed={star === committed}
              className={`rounded p-0.5 transition ${
                readOnly ? 'cursor-default' : 'hover:scale-105'
              }`}
              onMouseEnter={() => !readOnly && setHoverValue(star)}
              onFocus={() => !readOnly && setHoverValue(star)}
              onBlur={() => setHoverValue(null)}
              onClick={() => !readOnly && onChange(star)}
              onKeyDown={(e) => {
                if (readOnly) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange(star);
                }
              }}
            >
              <Star
                className={`h-5 w-5 ${
                  filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                }`}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
