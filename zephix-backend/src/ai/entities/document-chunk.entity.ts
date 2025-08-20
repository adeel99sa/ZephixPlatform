export interface DocumentChunk {
  content: string;
  type:
    | 'paragraph'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'list_item'
    | 'table_cell'
    | 'heading';
  metadata: {
    source_document_id: string;
    page_number?: number;
    preceding_heading?: string;
    section_level?: number;
    list_type?: 'bullet' | 'numbered';
    table_position?: { row: number; col: number };
  };
}
