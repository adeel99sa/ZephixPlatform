export class AnalyzeCsvResponseDto {
  columns: string[];
  sampleRows: string[][];
  detectedPreset: 'clickup' | 'asana' | 'generic';
  rowCount: number;
  fileToken: string;
}
