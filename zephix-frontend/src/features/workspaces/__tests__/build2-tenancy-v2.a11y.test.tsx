/**
 * jest-axe checks for Build 2 tenancy scaffolding components.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ComplexityModeSelector } from '@/features/workspaces/components/ComplexityModeSelector';
import { ProgramsTierGate } from '@/features/workspaces/components/ProgramsTierGate';
import * as flags from '@/lib/flags';

expect.extend(toHaveNoViolations);

describe('Build 2 tenancy — jest-axe', () => {
  it('ComplexityModeSelector', async () => {
    const { container } = render(
      <ComplexityModeSelector value="standard" onChange={() => {}} helperText="Pick a mode." />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ProgramsTierGate (flag off — pass-through)', async () => {
    vi.spyOn(flags, 'isB2TenancyV2Enabled').mockReturnValue(false);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <ProgramsTierGate workspaceId="ws-1">
          <main>
            <h1>Programs</h1>
          </main>
        </ProgramsTierGate>
      </QueryClientProvider>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
