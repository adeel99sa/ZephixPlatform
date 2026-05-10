import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ProgramsTierGate } from '@/features/workspaces/components/ProgramsTierGate';
import * as workspaceApi from '@/features/workspaces/workspace.api';
import * as flags from '@/lib/flags';

describe('ProgramsTierGate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function wrap(ui: ReactNode) {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
  }

  it('renders children when B2 flag is off without fetching', () => {
    vi.spyOn(flags, 'isB2TenancyV2Enabled').mockReturnValue(false);
    const spy = vi.spyOn(workspaceApi, 'getWorkspaceComplexityMode');
    wrap(
      <ProgramsTierGate workspaceId="ws-1">
        <span data-testid="inner">Programs UI</span>
      </ProgramsTierGate>,
    );
    expect(screen.getByTestId('inner')).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it('renders children when mode is governed', async () => {
    vi.spyOn(flags, 'isB2TenancyV2Enabled').mockReturnValue(true);
    vi.spyOn(workspaceApi, 'getWorkspaceComplexityMode').mockResolvedValue({ mode: 'governed' });
    wrap(
      <ProgramsTierGate workspaceId="ws-1">
        <span data-testid="inner">Programs UI</span>
      </ProgramsTierGate>,
    );
    await waitFor(() => expect(screen.getByTestId('inner')).toBeInTheDocument());
  });

  it('renders banner when mode is standard', async () => {
    vi.spyOn(flags, 'isB2TenancyV2Enabled').mockReturnValue(true);
    vi.spyOn(workspaceApi, 'getWorkspaceComplexityMode').mockResolvedValue({ mode: 'standard' });
    wrap(
      <ProgramsTierGate workspaceId="ws-1">
        <span data-testid="inner">Programs UI</span>
      </ProgramsTierGate>,
    );
    await waitFor(() => expect(screen.getByTestId('programs-tier-gate-banner')).toBeInTheDocument());
    expect(screen.queryByTestId('inner')).not.toBeInTheDocument();
  });
});
