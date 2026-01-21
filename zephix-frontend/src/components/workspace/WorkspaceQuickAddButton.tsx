import type { ReactNode } from 'react';

type Props = {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children?: ReactNode;
};

export function WorkspaceQuickAddButton({ onClick, disabled, title, children }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title || 'Create'}
      className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded border bg-white text-sm hover:bg-gray-50 disabled:opacity-50"
      aria-label="Workspace quick add"
    >
      {children || '+'}
    </button>
  );
}
