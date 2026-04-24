/**
 * Per-widget error boundary — isolates crashes so one broken card
 * doesn't take down the entire workspace dashboard.
 *
 * Enterprise standard: each dashboard widget is wrapped in its own
 * boundary. If a card's data shape changes or a render error occurs,
 * only that card shows an error state — all other cards continue working.
 */
import React from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  cardId?: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WidgetErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[WidgetErrorBoundary] Card "${this.props.cardId ?? 'unknown'}" crashed:`,
      error.message,
      info.componentStack,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">This widget encountered an error</p>
            <p className="mt-0.5 text-xs text-red-500 dark:text-red-400">
              {this.state.error?.message || 'Unknown error'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="ml-auto shrink-0 rounded-md border border-red-300 px-2 py-1 text-xs font-medium hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/50"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
