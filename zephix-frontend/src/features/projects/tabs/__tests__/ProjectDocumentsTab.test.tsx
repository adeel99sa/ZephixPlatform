import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProjectDocumentsTab } from '../ProjectDocumentsTab';
import type { Document } from '@/features/documents/types';

const MOCK_DOC: Document = {
  id: 'doc-1',
  workspaceId: 'ws-1',
  projectId: 'proj-1',
  title: 'Requirements Spec',
  content: { sections: ['intro', 'scope'] },
  version: 1,
  createdByUserId: 'user-1',
  createdAt: '2026-01-10T00:00:00Z',
  updatedAt: '2026-01-10T00:00:00Z',
};

const MOCK_DOC_V2: Document = {
  ...MOCK_DOC,
  id: 'doc-2',
  title: 'Design Document',
  version: 3,
  updatedAt: '2026-01-12T00:00:00Z',
};

// Mock API
vi.mock('@/features/documents/documents.api', () => ({
  listDocuments: vi.fn(),
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));

// Mock workspace store
vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: () => ({ activeWorkspaceId: 'ws-1' }),
}));

import {
  listDocuments,
  createDocument,
  updateDocument,
} from '@/features/documents/documents.api';

function renderTab() {
  return render(
    <MemoryRouter initialEntries={['/projects/proj-1/documents']}>
      <Routes>
        <Route path="/projects/:projectId/documents" element={<ProjectDocumentsTab />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProjectDocumentsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list of documents with version numbers', async () => {
    (listDocuments as ReturnType<typeof vi.fn>).mockResolvedValue([MOCK_DOC, MOCK_DOC_V2]);

    renderTab();

    await waitFor(() => {
      expect(screen.getByText('Requirements Spec')).toBeInTheDocument();
      expect(screen.getByText('Design Document')).toBeInTheDocument();
    });

    const versions = screen.getAllByTestId('doc-version');
    expect(versions[0]).toHaveTextContent('v1');
    expect(versions[1]).toHaveTextContent('v3');
  });

  it('renders empty state when no documents', async () => {
    (listDocuments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    renderTab();

    await waitFor(() => {
      expect(screen.getByText(/no documents yet/i)).toBeInTheDocument();
    });
  });

  it('shows create form and creates document', async () => {
    (listDocuments as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (createDocument as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_DOC);

    renderTab();

    await waitFor(() => {
      expect(screen.getByText(/new document/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/new document/i));

    await waitFor(() => {
      expect(screen.getByTestId('doc-title-input')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('doc-title-input'), {
      target: { value: 'Test Doc' },
    });
    fireEvent.change(screen.getByTestId('doc-content-input'), {
      target: { value: '{"key": "value"}' },
    });
    fireEvent.click(screen.getByTestId('doc-create-submit'));

    await waitFor(() => {
      expect(createDocument).toHaveBeenCalledWith('proj-1', {
        title: 'Test Doc',
        content: { key: 'value' },
      });
    });
  });

  it('validates JSON content before submitting', async () => {
    (listDocuments as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    renderTab();

    await waitFor(() => {
      expect(screen.getByText(/new document/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/new document/i));

    await waitFor(() => {
      expect(screen.getByTestId('doc-title-input')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('doc-title-input'), {
      target: { value: 'Bad JSON' },
    });
    fireEvent.change(screen.getByTestId('doc-content-input'), {
      target: { value: '{invalid json' },
    });
    fireEvent.click(screen.getByTestId('doc-create-submit'));

    await waitFor(() => {
      expect(screen.getByText(/content must be valid json/i)).toBeInTheDocument();
    });
    expect(createDocument).not.toHaveBeenCalled();
  });

  it('opens edit form on pencil click and updates', async () => {
    (listDocuments as ReturnType<typeof vi.fn>).mockResolvedValue([MOCK_DOC]);
    (updateDocument as ReturnType<typeof vi.fn>).mockResolvedValue({ ...MOCK_DOC, version: 2 });

    renderTab();

    await waitFor(() => {
      expect(screen.getByText('Requirements Spec')).toBeInTheDocument();
    });

    // Click edit (pencil) button
    const editButtons = screen.getAllByTitle('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('doc-edit-form')).toBeInTheDocument();
    });

    // Update content and save
    fireEvent.change(screen.getByTestId('doc-edit-content'), {
      target: { value: '{"updated": true}' },
    });
    fireEvent.click(screen.getByTestId('doc-edit-save'));

    await waitFor(() => {
      expect(updateDocument).toHaveBeenCalledWith('proj-1', 'doc-1', expect.objectContaining({
        content: { updated: true },
      }));
    });
  });
});
