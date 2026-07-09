import { apiClient } from '@/lib/api/client';
import type { AnalyzeCsvResult, CsvColumnMapping, ExecuteCsvResult } from './importer.types';

const MAX_BYTES = 5 * 1024 * 1024;

export function validateCsvFileClient(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return 'Only .csv files are accepted.';
  }
  if (file.size > MAX_BYTES) {
    return 'This file exceeds the 5 MB limit. Split it into smaller files and try again.';
  }
  return null;
}

export async function analyzeCsvFile(
  file: File,
  workspaceId: string,
): Promise<AnalyzeCsvResult> {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient.post<AnalyzeCsvResult>('/import/csv/analyze', formData, {
    headers: {
      'x-workspace-id': workspaceId,
      'Content-Type': undefined as unknown as string,
    },
  });
}

export async function executeCsvImport(params: {
  projectId: string;
  workspaceId: string;
  mapping: CsvColumnMapping;
  dryRun: boolean;
  fileToken: string;
}): Promise<ExecuteCsvResult> {
  return apiClient.post<ExecuteCsvResult>(
    '/import/csv/execute',
    {
      projectId: params.projectId,
      mapping: params.mapping,
      dryRun: params.dryRun,
      fileToken: params.fileToken,
    },
    {
      headers: { 'x-workspace-id': params.workspaceId },
    },
  );
}
