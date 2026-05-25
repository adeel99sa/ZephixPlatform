/**
 * Sprint 5.2a hotfix — combined Mode D + Mode E integration test.
 *
 * Exercises the FULL click → store-read → mutation → success path with
 * Zustand `activeWorkspaceId = null` at render time (the Mode D race
 * condition) and a real DOM click (the Mode E click-delivery
 * regression). Both originally produced the same symptom — zero
 * network requests — so a single integration test that covers the
 * full path is sufficient to catch either bug recurring.
 *
 * What this test guards against:
 *
 * - Mode D: confirms `handleCreate` defensively calls
 *   `setActiveWorkspace(workspaceId)` BEFORE the mutation fires. If
 *   the picker stops doing this, the api.ts interceptor will throw
 *   `WORKSPACE_REQUIRED` pre-flight when activeWorkspaceId is null
 *   and zero requests will fire.
 *
 * - Mode E: confirms a real `userEvent.click` on the Create button
 *   actually triggers the mutation. If the modal slips back to
 *   pointer-events-none on the panel, or loses the portal, this
 *   click will land on the wrong layer and the mutation won't
 *   fire.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock factories are hoisted above all top-level `const` declarations.
// Spies referenced inside factories must be created with vi.hoisted so they
// exist at hoist time. See: https://vitest.dev/api/vi.html#vi-hoisted
const {
  navigateSpy,
  setActiveWorkspaceSpy,
  createProjectArtifactSpy,
  toastSuccessSpy,
  toastErrorSpy,
} = vi.hoisted(() => ({
  navigateSpy: vi.fn(),
  setActiveWorkspaceSpy: vi.fn(),
  createProjectArtifactSpy: vi.fn(),
  toastSuccessSpy: vi.fn(),
  toastErrorSpy: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return { ...actual, useNavigate: () => navigateSpy };
});

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: (selector?: (state: unknown) => unknown) => {
    const state = {
      activeWorkspaceId: null as string | null,
      setActiveWorkspace: setActiveWorkspaceSpy,
    };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

vi.mock('@/api/project-artifacts.api', () => ({
  createProjectArtifact: (...args: unknown[]) => createProjectArtifactSpy(...args),
  // Other exports unused by the picker, but the hook module imports the
  // full namespace — stub them so the module loads cleanly.
  listProjectArtifacts: vi.fn(),
  getProjectArtifact: vi.fn(),
  updateProjectArtifact: vi.fn(),
  deleteProjectArtifact: vi.fn(),
  reorderProjectArtifacts: vi.fn(),
  listArtifactItems: vi.fn(),
  createArtifactItem: vi.fn(),
  updateArtifactItem: vi.fn(),
  deleteArtifactItem: vi.fn(),
  reorderArtifactItems: vi.fn(),
  bulkCreateArtifactItems: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccessSpy, error: toastErrorSpy },
}));

import { ArtifactTypePickerModal } from '../ArtifactTypePickerModal';

const PROJECT_ID = '11111111-1111-1111-1111-111111111111';
const WORKSPACE_ID = '22222222-2222-2222-2222-222222222222';

function renderPicker(overrides: Partial<{
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ArtifactTypePickerModal
          open={overrides.open ?? true}
          projectId={PROJECT_ID}
          projectName="Datadog Migration"
          workspaceId={WORKSPACE_ID}
          onClose={overrides.onClose ?? vi.fn()}
          onCreated={overrides.onCreated}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  setActiveWorkspaceSpy.mockReset();
  createProjectArtifactSpy.mockReset();
  toastSuccessSpy.mockReset();
  toastErrorSpy.mockReset();
  navigateSpy.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ArtifactTypePickerModal — Sprint 5.2a hotfix integration', () => {
  it(
    'Mode D self-heal + Mode E click delivery: clicking Create with ' +
      'activeWorkspaceId=null sets the workspace, fires the mutation, ' +
      'and navigates to the new artifact',
    async () => {
      const createdId = '33333333-3333-3333-3333-333333333333';
      createProjectArtifactSpy.mockResolvedValue({
        id: createdId,
        type: 'risk_register',
        name: 'Risk Register',
        projectId: PROJECT_ID,
        organizationId: 'org-1',
        workspaceId: WORKSPACE_ID,
        customFieldDefinitions: [],
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const onCreated = vi.fn();
      const onClose = vi.fn();

      renderPicker({ onCreated, onClose });

      const button = await screen.findByTestId('artifact-type-picker-create');
      expect(button).toBeEnabled();

      const user = userEvent.setup();
      await user.click(button);

      // Mode D assertion: defensive self-heal must run before the mutation
      // so the api.ts interceptor sees a populated activeWorkspaceId.
      await waitFor(() => {
        expect(setActiveWorkspaceSpy).toHaveBeenCalledWith(WORKSPACE_ID);
      });

      // Mode E assertion: the click reached the handler AND the handler
      // dispatched the mutation with the correct args. A regression that
      // re-introduces pointer-events-none on the panel, or removes the
      // portal, would prevent this call.
      await waitFor(() => {
        expect(createProjectArtifactSpy).toHaveBeenCalledTimes(1);
      });
      expect(createProjectArtifactSpy).toHaveBeenCalledWith(PROJECT_ID, {
        type: 'risk_register',
        name: 'Risk Register',
      });

      // Order invariant: setActiveWorkspace fired BEFORE the mutation, not
      // after. (If reversed, the interceptor's pre-flight throw could still
      // fire in production even though the test wouldn't notice.)
      const setWsCallOrder = setActiveWorkspaceSpy.mock.invocationCallOrder[0];
      const createCallOrder = createProjectArtifactSpy.mock.invocationCallOrder[0];
      expect(setWsCallOrder).toBeLessThan(createCallOrder);

      // Success path: onCreated callback fired, onClose called, navigate to
      // the new artifact's detail route.
      await waitFor(() => {
        expect(onCreated).toHaveBeenCalledWith(createdId);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(navigateSpy).toHaveBeenCalledWith(
        `/projects/${PROJECT_ID}/artifacts/${createdId}`,
      );
      expect(toastSuccessSpy).toHaveBeenCalled();
      expect(toastErrorSpy).not.toHaveBeenCalled();
    },
  );
});
