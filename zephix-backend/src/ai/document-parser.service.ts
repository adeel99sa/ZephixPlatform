import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mammoth from 'mammoth';
import * as pdfParse from 'pdf-parse';
import { Readable } from 'stream';

export interface DocumentChunk {
  content: string;
  type: 'paragraph' | 'h1' | 'h2' | 'h3' | 'list_item' | 'table_cell' | 'heading';
  metadata: {
    source_document_id: string;
    page_number?: number;
    preceding_heading?: string;
    section_level?: number;
    list_type?: 'bullet' | 'numbered';
    table_position?: { row: number; col: number };
  };
}

export interface ParsedDocument {
  documentId: string;
  filename: string;
  chunks: DocumentChunk[];
  metadata: {
    totalChunks: number;
    documentType: string;
    processingTime: number;
    extractedAt: Date;
  };
}

export interface ParseResult {
  success: boolean;
  document?: ParsedDocument;
  error?: string;
  processingTime: number;
}

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Parse a document file and extract structured content chunks
   */
  async parseDocument(
    fileBuffer: Buffer,
    filename: string,
    documentId: string,
  ): Promise<ParseResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Starting document parsing for ${filename} (${documentId})`);
      
      const fileExtension = this.getFileExtension(filename);
      let chunks: DocumentChunk[] = [];
      
      switch (fileExtension.toLowerCase()) {
        case 'docx':
          chunks = await this.parseDocx(fileBuffer, documentId);
          break;
        case 'pdf':
          chunks = await this.parsePdf(fileBuffer, documentId);
          break;
        default:
          throw new Error(`Unsupported file format: ${fileExtension}`);
      }
      
      const processingTime = Date.now() - startTime;
      
      const parsedDocument: ParsedDocument = {
        documentId,
        filename,
        chunks,
        metadata: {
          totalChunks: chunks.length,
          documentType: fileExtension,
          processingTime,
          extractedAt: new Date(),
        },
      };
      
      this.logger.log(
        `Successfully parsed ${filename}: ${chunks.length} chunks in ${processingTime}ms`,
      );
      
      return {
        success: true,
        document: parsedDocument,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `Failed to parse document ${filename}: ${error.message}`,
        error.stack,
      );
      
      return {
        success: false,
        error: error.message,
        processingTime,
      };
    }
  }

  /**
   * Parse .docx files using mammoth.js
   */
  private async parseDocx(fileBuffer: Buffer, documentId: string): Promise<DocumentChunk[]> {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    const text = result.value;
    
    // Split text into paragraphs and identify structure
    const lines = text.split('\n').filter(line => line.trim().length > 0);
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
  private async parsePdf(fileBuffer: Buffer, documentId: string): Promise<DocumentChunk[]> {
    const data = await pdfParse(fileBuffer);
    const text = data.text;
    
    // Split text into paragraphs and identify structure
    const lines = text.split('\n').filter(line => line.trim().length > 0);
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
   * Detect if a line is likely a heading
   */
  private isHeading(line: string, allLines: string[], currentIndex: number): boolean {
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
      if (line.endsWith(':') || line.match(/^[A-Z][^.!?]*$/)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Detect if a line is a list item
   */
  private isListItem(line: string): boolean {
    return line.match(/^[\s]*[•\-\*]\s/) !== null || line.match(/^[\s]*\d+\.\s/) !== null;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    return filename.split('.').pop() || '';
  }

  /**
   * Validate file format and size
   */
  validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['.docx', '.pdf'];
    
    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }
    
    const fileExtension = this.getFileExtension(file.originalname);
    if (!allowedTypes.includes(`.${fileExtension.toLowerCase()}`)) {
      return { valid: false, error: `Unsupported file type: ${fileExtension}` };
    }
    
    return { valid: true };
  }
}
