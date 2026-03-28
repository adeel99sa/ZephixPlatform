/**
 * Phase 2G: Attachment Component Tests
 *
 * Covers: guest vs member vs admin gating, upload flow,
 * list rendering, delete visibility, error states.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock API
const mockListAttachments = vi.fn().mockResolvedValue([
  {
    id: 'att-1',
    parentType: 'work_task',
    parentId: 'task-1',
    fileName: 'budget.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sizeBytes: 102400,
    uploaderUserId: 'u1',
    uploadedAt: '2026-02-10T12:00:00Z',
    status: 'uploaded',
    createdAt: '2026-02-10T12:00:00Z',
  },
]);

const mockGetDownloadUrl = vi.fn().mockResolvedValue({
  downloadUrl: 'https://s3.example.com/download',
  attachment: { id: 'att-1' },
});

const mockDeleteAttachment = vi.fn().mockResolvedValue(undefined);

vi.mock('../attachments.api', () => ({
  listAttachments: (...args: any[]) => mockListAttachments(...args),
  getDownloadUrl: (...args: any[]) => mockGetDownloadUrl(...args),
  deleteAttachment: (...args: any[]) => mockDeleteAttachment(...args),
  uploadFile: vi.fn(),
}));

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: {
    getState: () => ({ activeWorkspace: { id: 'ws-1' } }),
  },
}));

import { AttachmentList } from '../AttachmentList';
import { AttachmentUploader } from '../AttachmentUploader';
import { AttachmentSection } from '../AttachmentSection';

describe('AttachmentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders attachment list with file name and size', async () => {
    render(
      <AttachmentList parentType="work_task" parentId="task-1" />,
    );
    await waitFor(() => {
      expect(screen.getByText('budget.xlsx')).toBeTruthy();
      expect(screen.getByText('100.0 KB')).toBeTruthy();
    });
  });

  it('shows download button for all users', async () => {
    render(
      <AttachmentList parentType="work_task" parentId="task-1" />,
    );
    await waitFor(() => {
      expect(screen.getByText('Download')).toBeTruthy();
    });
  });

  it('hides delete button when canWrite is false (guest)', async () => {
    render(
      <AttachmentList parentType="work_task" parentId="task-1" canWrite={false} />,
    );
    await waitFor(() => {
      expect(screen.getByText('budget.xlsx')).toBeTruthy();
    });
    expect(screen.queryByText('Delete')).toBeNull();
  });

  it('shows delete button for uploader when canWrite is true', async () => {
    render(
      <AttachmentList
        parentType="work_task"
        parentId="task-1"
        canWrite={true}
        currentUserId="u1"
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeTruthy();
    });
  });

  it('shows delete button for admin even if not uploader', async () => {
    render(
      <AttachmentList
        parentType="work_task"
        parentId="task-1"
        canWrite={true}
        currentUserId="u-other"
        isAdmin={true}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeTruthy();
    });
  });

  it('hides delete when canWrite but not uploader and not admin', async () => {
    render(
      <AttachmentList
        parentType="work_task"
        parentId="task-1"
        canWrite={true}
        currentUserId="u-other"
        isAdmin={false}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('budget.xlsx')).toBeTruthy();
    });
    expect(screen.queryByText('Delete')).toBeNull();
  });

  it('shows empty message when no attachments', async () => {
    mockListAttachments.mockResolvedValueOnce([]);
    render(
      <AttachmentList parentType="work_task" parentId="task-1" />,
    );
    await waitFor(() => {
      expect(screen.getByText('No attachments.')).toBeTruthy();
    });
  });

  it('shows error state on API failure', async () => {
    mockListAttachments.mockRejectedValueOnce(new Error('Network fail'));
    render(
      <AttachmentList parentType="work_task" parentId="task-1" />,
    );
    await waitFor(() => {
      expect(screen.getByText('Network fail')).toBeTruthy();
    });
  });
});

describe('AttachmentUploader', () => {
  it('renders Attach File button', () => {
    render(
      <AttachmentUploader parentType="work_task" parentId="task-1" />,
    );
    expect(screen.getByText('Attach File')).toBeTruthy();
  });

  it('validates blocked extensions client-side', async () => {
    render(
      <AttachmentUploader parentType="work_task" parentId="task-1" />,
    );
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'malware.exe', { type: 'application/octet-stream' });
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText(/not allowed/)).toBeTruthy();
    });
  });
});

describe('AttachmentSection', () => {
  it('shows uploader when canWrite is true', async () => {
    render(
      <AttachmentSection
        parentType="work_task"
        parentId="task-1"
        canWrite={true}
        currentUserId="u1"
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Attach File')).toBeTruthy();
    });
  });

  it('hides uploader when canWrite is false', async () => {
    render(
      <AttachmentSection
        parentType="work_task"
        parentId="task-1"
        canWrite={false}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Attachments')).toBeTruthy();
    });
    expect(screen.queryByText('Attach File')).toBeNull();
  });
});
