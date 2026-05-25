import { Star } from 'lucide-react';

type RatingProps = {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  readOnly?: boolean;
  label?: string;
};

/** Five-star rating control (Sprint 5.2a artifact custom fields). */
export function Rating({
  value,
  onChange,
  max = 5,
  readOnly = false,
  label = 'Rating',
}: RatingProps) {
  const clamped = Math.max(0, Math.min(max, Math.round(value) || 0));

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={label}>
      {Array.from({ length: max }, (_, i) => {
        const star = i + 1;
        const filled = star <= clamped;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            aria-label={`${star} of ${max} stars`}
            aria-pressed={filled}
            className={`rounded p-0.5 transition ${
              readOnly ? 'cursor-default' : 'hover:scale-105'
            }`}
            onClick={() => !readOnly && onChange(star)}
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
  );
}
