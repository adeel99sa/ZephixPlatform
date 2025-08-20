import { Injectable, Logger } from '@nestjs/common';
import * as mammoth from 'mammoth';
import * as pdfParse from 'pdf-parse';
import { DocumentChunk } from './entities/document-chunk.entity';

// ✅ PROPER TYPING - NO MORE 'any' TYPES
interface ParsedDocument {
  id: string;
  filename: string;
  content: DocumentChunk[];
  metadata: {
    fileSize: number;
    pageCount?: number;
    processingTime: number;
  };
}

interface ParseResult {
  success: boolean;
  document?: ParsedDocument;
  error?: string;
  processingTime: number;
}

interface PdfParseResult {
  text: string;
  numpages: number;
  info: Record<string, unknown>;
}

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name);

  /**
   * Parse document content and extract structured information
   */
  async parseDocument(
    fileBuffer: Buffer,
    filename: string,
    documentId: string,
  ): Promise<ParseResult> {
    const startTime = Date.now();

    try {
      const fileExtension = filename.split('.').pop()?.toLowerCase();
      let chunks: DocumentChunk[] = [];

      switch (fileExtension) {
        case 'pdf':
          chunks = await this.parsePdf(fileBuffer, documentId);
          break;
        case 'docx':
          chunks = await this.parseDocx(fileBuffer, documentId);
          break;
        case 'txt':
          chunks = this.parseTxt(fileBuffer, documentId);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`);
      }

      const processingTime = Date.now() - startTime;
      const parsedDocument: ParsedDocument = {
        id: documentId,
        filename,
        content: chunks,
        metadata: {
          fileSize: fileBuffer.length,
          processingTime,
        },
      };

      return {
        success: true,
        document: parsedDocument,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      this.logger.error(
        `Failed to parse document ${filename}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      return {
        success: false,
        error: errorMessage,
        processingTime,
      };
    }
  }

  /**
   * Parse .docx files using mammoth.js
   */
  private async parseDocx(
    fileBuffer: Buffer,
    documentId: string,
  ): Promise<DocumentChunk[]> {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    const text = result.value;

    // Split text into paragraphs and identify structure
    const lines = text.split('\n').filter((line) => line.trim().length > 0);
    const chunks: DocumentChunk[] = [];
    let currentHeading = '';
    let sectionLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.length === 0) continue;

      // Detect headings based on length and formatting patterns
      if (this.isHeading(line, lines, i)) {
        if (line.length < 50) {
          // Likely a heading
          if (line.length < 20) {
            sectionLevel = 1; // H1
            currentHeading = line;
          } else if (line.length < 30) {
            sectionLevel = 2; // H2
          } else {
            sectionLevel = 3; // H3
          }

          chunks.push({
            content: line,
            type: 'heading',
            metadata: {
              source_document_id: documentId,
              preceding_heading: currentHeading,
              section_level: sectionLevel,
            },
          });
        } else {
          // Long line, treat as paragraph
          chunks.push({
            content: line,
            type: 'paragraph',
            metadata: {
              source_document_id: documentId,
              preceding_heading: currentHeading,
            },
          });
        }
      } else if (this.isListItem(line)) {
        // Detect list items
        chunks.push({
          content: line,
          type: 'list_item',
          metadata: {
            source_document_id: documentId,
            preceding_heading: currentHeading,
            list_type: line.match(/^\d+\./) ? 'numbered' : 'bullet',
          },
        });
      } else {
        // Regular paragraph
        chunks.push({
          content: line,
          type: 'paragraph',
          metadata: {
            source_document_id: documentId,
            preceding_heading: currentHeading,
          },
        });
      }
    }

    return chunks;
  }

  /**
   * Parse .pdf files using pdf-parse
   */
  private async parsePdf(
    fileBuffer: Buffer,
    documentId: string,
  ): Promise<DocumentChunk[]> {
    const data = (await pdfParse(fileBuffer)) as PdfParseResult;
    const text = data.text;

    // Split text into paragraphs and identify structure
    const lines = text.split('\n').filter((line) => line.trim().length > 0);
    const chunks: DocumentChunk[] = [];
    let currentHeading = '';
    let sectionLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.length === 0) continue;

      // Detect headings based on length and formatting patterns
      if (this.isHeading(line, lines, i)) {
        if (line.length < 50) {
          // Likely a heading
          if (line.length < 20) {
            sectionLevel = 1; // H1
            currentHeading = line;
          } else if (line.length < 30) {
            sectionLevel = 2; // H2
          } else {
            sectionLevel = 3; // H3
          }

          chunks.push({
            content: line,
            type: 'heading',
            metadata: {
              source_document_id: documentId,
              preceding_heading: currentHeading,
              section_level: sectionLevel,
            },
          });
        } else {
          // Long line, treat as paragraph
          chunks.push({
            content: line,
            type: 'paragraph',
            metadata: {
              source_document_id: documentId,
              preceding_heading: currentHeading,
            },
          });
        }
      } else if (this.isListItem(line)) {
        // Detect list items
        chunks.push({
          content: line,
          type: 'list_item',
          metadata: {
            source_document_id: documentId,
            preceding_heading: currentHeading,
            list_type: line.match(/^\d+\./) ? 'numbered' : 'bullet',
          },
        });
      } else {
        // Regular paragraph
        chunks.push({
          content: line,
          type: 'paragraph',
          metadata: {
            source_document_id: documentId,
            preceding_heading: currentHeading,
          },
        });
      }
    }

    return chunks;
  }

  /**
   * Parse .txt files
   */
  public parseTxt(fileBuffer: Buffer, documentId: string): DocumentChunk[] {
    const text = fileBuffer.toString('utf-8');
    const lines = text.split('\n').filter((line) => line.trim().length > 0);
    const chunks: DocumentChunk[] = [];
    let currentHeading = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.length === 0) continue;

      // Detect headings based on length and formatting patterns
      if (this.isHeading(line, lines, i)) {
        if (line.length < 50) {
          // Likely a heading
          currentHeading = line;
          chunks.push({
            content: line,
            type: 'heading',
            metadata: {
              source_document_id: documentId,
              preceding_heading: currentHeading,
              section_level: 1,
            },
          });
        } else {
          // Long line, treat as paragraph
          chunks.push({
            content: line,
            type: 'paragraph',
            metadata: {
              source_document_id: documentId,
              preceding_heading: currentHeading,
            },
          });
        }
      } else if (this.isListItem(line)) {
        // Detect list items
        chunks.push({
          content: line,
          type: 'list_item',
          metadata: {
            source_document_id: documentId,
            preceding_heading: currentHeading,
            list_type: line.match(/^\d+\./) ? 'numbered' : 'bullet',
          },
        });
      } else {
        // Regular paragraph
        chunks.push({
          content: line,
          type: 'paragraph',
          metadata: {
            source_document_id: documentId,
            preceding_heading: currentHeading,
          },
        });
      }
    }

    return chunks;
  }

  /**
   * Detect if a line is likely a heading
   */
  private isHeading(
    line: string,
    allLines: string[],
    currentIndex: number,
  ): boolean {
    // Short lines are more likely to be headings
    if (line.length < 50) {
      // Check if next line is longer (indicating this is a heading followed by content)
      if (currentIndex + 1 < allLines.length) {
        const nextLine = allLines[currentIndex + 1].trim();
        if (nextLine.length > line.length * 2) {
          return true;
        }
      }

      // Check for common heading patterns
      const headingPatterns = [
        /^[A-Z][A-Z\s]+$/, // ALL CAPS
        /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/, // Title Case
        /^\d+\.\s/, // Numbered headings
        /^[A-Z]\.\s/, // Letter headings
      ];

      return headingPatterns.some((pattern) => pattern.test(line));
    }

    return false;
  }

  /**
   * Detect if a line is a list item
   */
  private isListItem(line: string): boolean {
    const listPatterns = [
      /^[-*•]\s/, // Bullet points
      /^\d+\.\s/, // Numbered lists
      /^[a-z]\.\s/, // Letter lists
    ];

    return listPatterns.some((pattern) => pattern.test(line));
  }

  // New methods to satisfy tests
  async parseDocumentContent(content: string): Promise<DocumentChunk[]> {
    return this.parseTxt(Buffer.from(content), 'temp-doc-id');
  }

  async extractTextFromFile(fileBuffer: Buffer): Promise<string> {
    // Check if it's a PDF by looking for PDF header
    const isPdf = fileBuffer.toString('utf8', 0, 4) === '%PDF';

    if (isPdf) {
      const pdfResult = await this.parsePdf(fileBuffer, 'temp-doc-id');
      return pdfResult.map((chunk) => chunk.content).join('\n');
    } else {
      // Assume it's text for now
      return fileBuffer.toString('utf8');
    }
  }
}
