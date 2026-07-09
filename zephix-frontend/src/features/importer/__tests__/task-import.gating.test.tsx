/**
 * W2-F1 — CSV task import modal gating tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockAnalyzeCsvFile = vi.fn();
const mockExecuteCsvImport = vi.fn();
const mockValidateCsvFileClient = vi.fn();

vi.mock('../importer.api', () => ({
  analyzeCsvFile: (...args: unknown[]) => mockAnalyzeCsvFile(...args),
  executeCsvImport: (...args: unknown[]) => mockExecuteCsvImport(...args),
  validateCsvFileClient: (...args: unknown[]) => mockValidateCsvFileClient(...args),
}));

import { TaskImportModal } from '../components/TaskImportModal';
import {
  applyPresetMapping,
  buildApiMapping,
  isTitleMapped,
} from '../importer.mapping';
import { importErrorMessage } from '../importer.errors';

const CLICKUP_ANALYZE = {
  columns: ['Task Name', 'Status', 'Assignee', 'Due Date', 'Priority', 'Description'],
  sampleRows: [
    ['Alpha task', 'TODO', 'alice@example.com', '2026-08-01', 'High', 'Notes'],
    ['Beta task', 'DONE', '', '', 'Low', ''],
  ],
  detectedPreset: 'clickup' as const,
  rowCount: 2,
  fileToken: 'token-clickup',
};

const ASANA_ANALYZE = {
  columns: ['Name', 'Notes', 'Assignee', 'Due Date', 'Projects'],
  sampleRows: [['Asana task', 'Body', 'bob@example.com', '2026-09-01', 'Proj']],
  detectedPreset: 'asana' as const,
  rowCount: 1,
  fileToken: 'token-asana',
};

function renderModal(overrides: Partial<React.ComponentProps<typeof TaskImportModal>> = {}) {
  const onClose = vi.fn();
  const onImportComplete = vi.fn();
  render(
    <TaskImportModal
      open
      onClose={onClose}
      projectId="proj-1"
      workspaceId="ws-1"
      onImportComplete={onImportComplete}
      {...overrides}
    />,
  );
  return { onClose, onImportComplete };
}

async function uploadCsv(fileName = 'tasks.csv', options?: { skipRender?: boolean }) {
  if (!options?.skipRender) {
    renderModal();
  }
  const user = userEvent.setup();
  await waitFor(() => expect(screen.getByTestId('import-dropzone')).toBeInTheDocument());
  const file = new File(['header\nrow'], fileName, { type: 'text/csv' });
  const input = screen.getByTestId('import-file-input');
  await user.upload(input, file);
  return user;
}

describe('TaskImportModal (W2-F1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateCsvFileClient.mockReturnValue(null);
    mockAnalyzeCsvFile.mockResolvedValue(CLICKUP_ANALYZE);
    mockExecuteCsvImport.mockResolvedValue({
      totalRows: 2,
      importable: 2,
      skipped: [],
      created: 0,
      batchId: 'batch-1',
    });
  });

  it('disables Next until Title is mapped', async () => {
    mockAnalyzeCsvFile.mockResolvedValue({
      ...CLICKUP_ANALYZE,
      detectedPreset: 'generic',
    });
    await uploadCsv();
    await waitFor(() => expect(screen.getByTestId('import-mapping-step')).toBeInTheDocument());

    expect(screen.getByTestId('import-mapping-next')).toBeDisabled();

    const user = userEvent.setup();
    await user.selectOptions(screen.getByTestId('import-map-title'), '0');
    expect(screen.getByTestId('import-mapping-next')).toBeEnabled();
  });

  it('pre-selects ClickUp preset columns', async () => {
    await uploadCsv();
    await waitFor(() => expect(screen.getByTestId('import-mapping-step')).toBeInTheDocument());

    expect(screen.getByTestId('import-map-title')).toHaveValue('0');
    expect(screen.getByTestId('import-map-status')).toHaveValue('1');
    expect(screen.getByTestId('import-map-assigneeEmail')).toHaveValue('2');
    expect(screen.getByTestId('import-map-dueDate')).toHaveValue('3');
    expect(screen.getByTestId('import-map-priority')).toHaveValue('4');
  });

  it('pre-selects Asana preset columns', async () => {
    mockAnalyzeCsvFile.mockResolvedValue(ASANA_ANALYZE);
    await uploadCsv();
    await waitFor(() => expect(screen.getByTestId('import-mapping-step')).toBeInTheDocument());

    expect(screen.getByTestId('import-map-title')).toHaveValue('0');
    expect(screen.getByTestId('import-map-description')).toHaveValue('1');
    expect(screen.getByTestId('import-map-assigneeEmail')).toHaveValue('2');
    expect(screen.getByTestId('import-map-dueDate')).toHaveValue('3');
  });

  it('renders dry-run skip reasons with plain-language copy', async () => {
    mockExecuteCsvImport.mockResolvedValue({
      totalRows: 3,
      importable: 3,
      skipped: [
        { row: 2, reason: 'status_defaulted' },
        { row: 3, reason: 'assignee_not_found' },
        { row: 4, reason: 'date_unparsed' },
      ],
      created: 0,
      batchId: 'batch-dry',
    });

    await uploadCsv();
    await waitFor(() => expect(screen.getByTestId('import-mapping-step')).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId('import-mapping-next'));

    await waitFor(() => expect(screen.getByTestId('import-dry-run-step')).toBeInTheDocument());

    expect(screen.getByTestId('import-skip-group-status_defaulted')).toHaveTextContent(
      'Status not found in this project — the default status will be used',
    );
    expect(screen.getByTestId('import-skip-group-assignee_not_found')).toHaveTextContent(
      'No matching member — task will be unassigned',
    );
    expect(screen.getByTestId('import-skip-group-date_unparsed')).toHaveTextContent(
      'Date format not recognized — date will be left empty',
    );
    expect(screen.getByTestId('import-execute-button')).toHaveTextContent('Import 3 tasks');
  });

  it('shows inline error for analyze 400 responses', async () => {
    mockAnalyzeCsvFile.mockRejectedValue({
      response: {
        data: { code: 'INVALID_ENCODING', message: 'File must be UTF-8 encoded' },
      },
    });

    await uploadCsv();
    await waitFor(() => expect(screen.getByTestId('import-inline-error')).toBeInTheDocument());
    expect(screen.getByTestId('import-inline-error')).toHaveTextContent('UTF-8');
  });

  it('returns to upload step when file token expires on dry-run', async () => {
    mockExecuteCsvImport.mockRejectedValueOnce({
      response: {
        data: { code: 'FILE_TOKEN_EXPIRED', message: 'File token not found or expired' },
      },
    });

    await uploadCsv();
    await waitFor(() => expect(screen.getByTestId('import-mapping-step')).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId('import-mapping-next'));

    await waitFor(() => expect(screen.getByTestId('import-token-expired')).toBeInTheDocument());
    expect(screen.getByTestId('import-dropzone')).toBeInTheDocument();
  });

  it('shows retriable execute failure without implying partial success', async () => {
    mockExecuteCsvImport
      .mockResolvedValueOnce({
        totalRows: 1,
        importable: 1,
        skipped: [],
        created: 0,
        batchId: 'batch-dry',
      })
      .mockRejectedValueOnce({
        response: { data: { code: 'SYSTEM_ERROR', message: 'Import failed' } },
      });

    await uploadCsv();
    await waitFor(() => expect(screen.getByTestId('import-mapping-step')).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId('import-mapping-next'));
    await waitFor(() => expect(screen.getByTestId('import-dry-run-step')).toBeInTheDocument());

    await user.click(screen.getByTestId('import-execute-button'));

    await waitFor(() => expect(screen.getByTestId('import-inline-error')).toBeInTheDocument());
    expect(screen.getByTestId('import-inline-error')).toHaveTextContent(
      'No tasks were created',
    );
    expect(screen.getByTestId('import-dry-run-step')).toBeInTheDocument();
  });

  it('completes import and offers View tasks', async () => {
    mockExecuteCsvImport
      .mockResolvedValueOnce({
        totalRows: 1,
        importable: 1,
        skipped: [],
        created: 0,
        batchId: 'batch-dry',
      })
      .mockResolvedValueOnce({
        totalRows: 1,
        importable: 1,
        skipped: [],
        created: 1,
        batchId: 'batch-live',
      });

    const { onClose, onImportComplete } = renderModal();
    const user = await uploadCsv('tasks.csv', { skipRender: true });
    await waitFor(() => expect(screen.getByTestId('import-mapping-step')).toBeInTheDocument());

    await user.click(screen.getByTestId('import-mapping-next'));
    await waitFor(() => expect(screen.getByTestId('import-dry-run-step')).toBeInTheDocument());
    await user.click(screen.getByTestId('import-execute-button'));

    await waitFor(() => expect(screen.getByTestId('import-result-step')).toBeInTheDocument());
    await user.click(screen.getByTestId('import-view-tasks'));
    expect(onImportComplete).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

describe('importer mapping helpers', () => {
  it('requires title in buildApiMapping', () => {
    expect(isTitleMapped({ ...applyPresetMapping(CLICKUP_ANALYZE), title: null })).toBe(false);
    expect(buildApiMapping({ ...applyPresetMapping(CLICKUP_ANALYZE), title: null })).toBeNull();
    expect(buildApiMapping(applyPresetMapping(CLICKUP_ANALYZE))?.title).toBe(0);
  });

  it('maps row limit error copy with row count', () => {
    const msg = importErrorMessage({
      response: { data: { code: 'ROW_LIMIT_EXCEEDED', rowCount: 6000 } },
    });
    expect(msg).toContain('6000');
    expect(msg).toContain('5,000');
  });
});