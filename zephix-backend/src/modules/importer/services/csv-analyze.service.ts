import { Injectable, BadRequestException } from '@nestjs/common';
import { FileTokenService } from './file-token.service';
import { AnalyzeCsvResponseDto } from '../dto/analyze-csv.dto';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 5000;
const SAMPLE_ROWS = 10;

// ClickUp export signature: exact header set (order-independent, case-sensitive match)
const CLICKUP_REQUIRED_HEADERS = ['Task Name', 'Status', 'Assignee', 'Due Date', 'Priority'];
// Asana export signature
const ASANA_REQUIRED_HEADERS = ['Name', 'Assignee', 'Due Date', 'Projects', 'Notes'];

type DetectedPreset = 'clickup' | 'asana' | 'generic';

@Injectable()
export class CsvAnalyzeService {
  constructor(private readonly fileTokenService: FileTokenService) {}

  analyze(fileBuffer: Buffer, originalName: string): AnalyzeCsvResponseDto {
    if (fileBuffer.byteLength > MAX_FILE_BYTES) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: 'File exceeds 5 MB limit',
      });
    }

    // Strip UTF-8 BOM (EF BB BF) — Excel exports carry it
    const buf =
      fileBuffer[0] === 0xef && fileBuffer[1] === 0xbb && fileBuffer[2] === 0xbf
        ? fileBuffer.slice(3)
        : fileBuffer;

    // Validate UTF-8 encoding
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    } catch {
      throw new BadRequestException({
        code: 'INVALID_ENCODING',
        message: 'File must be UTF-8 encoded',
      });
    }

    const lines = splitCsvLines(text);
    if (lines.length === 0) {
      throw new BadRequestException({ code: 'EMPTY_FILE', message: 'CSV file is empty' });
    }

    const columns = parseCsvRow(lines[0]);
    if (columns.length === 0) {
      throw new BadRequestException({ code: 'NO_COLUMNS', message: 'CSV has no columns' });
    }

    const dataLines = lines.slice(1).filter((l) => l.trim().length > 0);
    const rowCount = dataLines.length;

    if (rowCount > MAX_ROWS) {
      throw new BadRequestException({
        code: 'ROW_LIMIT_EXCEEDED',
        message: `File has ${rowCount} rows; maximum is ${MAX_ROWS}`,
        rowCount,
        limit: MAX_ROWS,
      });
    }

    const sampleRows = dataLines.slice(0, SAMPLE_ROWS).map((l) => parseCsvRow(l));
    const detectedPreset = detectPreset(columns);
    const fileToken = this.fileTokenService.store(buf);

    return { columns, sampleRows, detectedPreset, rowCount, fileToken };
  }
}

function detectPreset(columns: string[]): DetectedPreset {
  const colSet = new Set(columns);
  if (CLICKUP_REQUIRED_HEADERS.every((h) => colSet.has(h))) return 'clickup';
  if (ASANA_REQUIRED_HEADERS.every((h) => colSet.has(h))) return 'asana';
  return 'generic';
}

/** Split CSV text into lines, handling quoted fields with embedded newlines. */
function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
        current += ch;
      }
    } else if ((ch === '\n' || ch === '\r') && !inQuote) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

/** Parse a single CSV row into fields, handling double-quoted fields. */
export function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === ',' && !inQuote) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}
