import type {
  AnalyzeCsvResult,
  CsvColumnMapping,
  ImportDetectedPreset,
  ImportMappingField,
  ImportUiMapping,
} from './importer.types';

const PRESET_HEADER_MAP: Record<
  Exclude<ImportDetectedPreset, 'generic'>,
  Partial<Record<ImportMappingField, string>>
> = {
  clickup: {
    title: 'Task Name',
    status: 'Status',
    assigneeEmail: 'Assignee',
    dueDate: 'Due Date',
    priority: 'Priority',
  },
  asana: {
    title: 'Name',
    description: 'Notes',
    assigneeEmail: 'Assignee',
    dueDate: 'Due Date',
  },
};

export function createEmptyUiMapping(): ImportUiMapping {
  return {
    title: null,
    description: null,
    status: null,
    priority: null,
    assigneeEmail: null,
    dueDate: null,
    tags: null,
  };
}

export function applyPresetMapping(
  analyze: Pick<AnalyzeCsvResult, 'columns' | 'detectedPreset'>,
): ImportUiMapping {
  const mapping = createEmptyUiMapping();
  if (analyze.detectedPreset === 'generic') {
    return mapping;
  }

  const preset = PRESET_HEADER_MAP[analyze.detectedPreset];
  for (const [field, header] of Object.entries(preset) as Array<
    [ImportMappingField, string]
  >) {
    const index = analyze.columns.indexOf(header);
    if (index >= 0) {
      mapping[field] = index;
    }
  }
  return mapping;
}

export function isTitleMapped(mapping: ImportUiMapping): boolean {
  return mapping.title !== null && mapping.title >= 0;
}

export function buildApiMapping(mapping: ImportUiMapping): CsvColumnMapping | null {
  if (!isTitleMapped(mapping)) return null;

  const result: CsvColumnMapping = { title: mapping.title! };
  if (mapping.description !== null) result.description = mapping.description;
  if (mapping.status !== null) result.status = mapping.status;
  if (mapping.priority !== null) result.priority = mapping.priority;
  if (mapping.assigneeEmail !== null) result.assigneeEmail = mapping.assigneeEmail;
  if (mapping.dueDate !== null) result.dueDate = mapping.dueDate;
  if (mapping.tags !== null) result.tags = mapping.tags;
  return result;
}

export function sampleValueForColumn(
  sampleRows: string[][],
  columnIndex: number | null,
): string {
  if (columnIndex === null || columnIndex < 0) return '—';
  for (const row of sampleRows) {
    const value = row[columnIndex]?.trim();
    if (value) return value;
  }
  return '—';
}

export function groupSkippedByReason(
  skipped: Array<{ row: number; reason: string }>,
): Map<string, number[]> {
  const groups = new Map<string, number[]>();
  for (const item of skipped) {
    const rows = groups.get(item.reason) ?? [];
    rows.push(item.row);
    groups.set(item.reason, rows);
  }
  for (const [reason, rows] of groups) {
    groups.set(reason, [...rows].sort((a, b) => a - b));
  }
  return groups;
}
