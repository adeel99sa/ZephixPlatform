import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';

/**
 * Sidebar uses React Query — unit tests must wrap with QueryClientProvider.
 */
export function createSidebarTestWrapper(
  routerProps: MemoryRouterProps = { initialEntries: ['/home'] },
): ({ children }: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function SidebarTestWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter {...routerProps}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}
