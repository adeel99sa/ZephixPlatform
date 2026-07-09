export type ImportDetectedPreset = 'clickup' | 'asana' | 'generic';

export type ImportMappingField =
  | 'title'
  | 'description'
  | 'status'
  | 'priority'
  | 'assigneeEmail'
  | 'dueDate'
  | 'tags';

export type ImportSkipReason =
  | 'status_defaulted'
  | 'assignee_not_found'
  | 'date_unparsed'
  | 'missing_title';

export interface AnalyzeCsvResult {
  columns: string[];
  sampleRows: string[][];
  detectedPreset: ImportDetectedPreset;
  rowCount: number;
  fileToken: string;
}

export interface CsvColumnMapping {
  title: number;
  description?: number;
  status?: number;
  priority?: number;
  assigneeEmail?: number;
  dueDate?: number;
  tags?: number;
}

export interface SkippedImportRow {
  row: number;
  reason: ImportSkipReason | string;
}

export interface ExecuteCsvResult {
  totalRows: number;
  importable: number;
  skipped: SkippedImportRow[];
  created: number;
  batchId: string;
}

export type ImportUiMapping = Record<ImportMappingField, number | null>;

export const IMPORT_MAPPING_FIELDS: Array<{
  key: ImportMappingField;
  label: string;
  required?: boolean;
}> = [
  { key: 'title', label: 'Title', required: true },
  { key: 'description', label: 'Description' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'assigneeEmail', label: 'Assignee email' },
  { key: 'dueDate', label: 'Due date' },
  { key: 'tags', label: 'Tags' },
];
