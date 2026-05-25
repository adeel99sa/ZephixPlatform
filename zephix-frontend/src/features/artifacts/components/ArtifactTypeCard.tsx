import type { ArtifactTypeMeta } from '@/features/artifacts/constants/artifactTypes.constants';

type Props = {
  meta: ArtifactTypeMeta;
  selected: boolean;
  onSelect: () => void;
};

export function ArtifactTypeCard({ meta, selected, onSelect }: Props) {
  const Icon = meta.icon;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full flex-col rounded-lg border p-3 text-left transition ${
        selected
          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
      data-testid={`artifact-type-card-${meta.id}`}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" aria-hidden />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{meta.label}</div>
          <p className="mt-1 text-xs leading-snug text-slate-500">{meta.description}</p>
        </div>
      </div>
    </button>
  );
}
