import { ReactNode } from 'react';

export default function AdminScaffold({
  title, 
  description, 
  actions, 
  children,
}: { 
  title: string; 
  description?: string; 
  actions?: ReactNode; 
  children?: ReactNode; 
}) {
  return (
    <section className="p-6 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </header>
      <div className="rounded-2xl border bg-card p-4">{children}</div>
    </section>
  );
}
