const ERROR_COPY: Record<string, string> = {
  INVALID_FILE_TYPE: 'Only .csv files are accepted.',
  NO_FILE: 'Choose a CSV file to continue.',
  FILE_TOO_LARGE: 'This file exceeds the 5 MB limit. Split it into smaller files and try again.',
  INVALID_ENCODING:
    'This file is not UTF-8 encoded. Re-export or save the spreadsheet as UTF-8 CSV and upload again.',
  EMPTY_FILE: 'The CSV file is empty.',
  NO_COLUMNS: 'The CSV has no column headers.',
  ROW_LIMIT_EXCEEDED: 'This file has too many rows. The maximum is 5,000 tasks per import.',
  FILE_TOKEN_EXPIRED:
    'Your upload session expired after 30 minutes. Upload the CSV again to continue.',
};

export function importErrorMessage(err: unknown): string {
  const data = extractErrorPayload(err);
  const code = typeof data?.code === 'string' ? data.code : undefined;
  if (code && ERROR_COPY[code]) {
    if (code === 'ROW_LIMIT_EXCEEDED' && typeof data?.rowCount === 'number') {
      return `This file has ${data.rowCount} rows. The maximum is 5,000 tasks per import.`;
    }
    return ERROR_COPY[code];
  }
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return 'Something went wrong. Try again.';
}

export function isFileTokenExpiredError(err: unknown): boolean {
  const data = extractErrorPayload(err);
  return data?.code === 'FILE_TOKEN_EXPIRED';
}

function extractErrorPayload(err: unknown): Record<string, unknown> | null {
  if (!err || typeof err !== 'object') return null;
  const response = (err as { response?: { data?: unknown } }).response;
  const body = response?.data;
  if (body && typeof body === 'object') {
    return body as Record<string, unknown>;
  }
  return null;
}

export const SKIP_REASON_COPY: Record<string, string> = {
  status_defaulted: 'Status not found in this project — the default status will be used',
  assignee_not_found: 'No matching member — task will be unassigned',
  date_unparsed: 'Date format not recognized — date will be left empty',
};
