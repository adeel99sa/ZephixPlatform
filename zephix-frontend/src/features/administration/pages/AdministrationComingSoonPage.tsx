import type { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
  testId?: string;
};

/**
 * Pre-MVP design lock: consistent placeholder for admin console surfaces
 * that are not wired yet — no failing API calls, no empty chrome.
 */
export default function AdministrationComingSoonPage({
  title,
  description,
  icon: Icon,
  testId,
}: Props) {
  return (
    <div className="space-y-6" data-testid={testId}>
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Icon className="mx-auto mb-4 h-12 w-12 text-slate-300" aria-hidden />
        <h2 className="mb-2 text-lg font-medium text-slate-800">{title}</h2>
        <p className="mx-auto mb-4 max-w-md text-sm text-slate-500">{description}</p>
        <span className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
          Coming soon
        </span>
      </div>
    </div>
  );
}
