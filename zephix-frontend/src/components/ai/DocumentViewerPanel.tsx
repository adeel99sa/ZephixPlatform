import React from 'react';

interface DocumentViewerPanelProps {
  chunks: any[];
  selectedChunkId: string | null;
  onChunkSelect: (chunkId: string) => void;
}

export const DocumentViewerPanel: React.FC<DocumentViewerPanelProps> = ({
  chunks,
  selectedChunkId,
  onChunkSelect,
}) => {
  const getChunkIcon = (type: string) => {
    switch (type) {
      case 'heading':
        return '📋';
      case 'paragraph':
        return '📝';
      case 'list_item':
        return '•';
      case 'table_cell':
        return '📊';
      default:
        return '📄';
    }
  };

  const getChunkStyle = (chunk: any, isSelected: boolean) => {
    const baseStyle = 'p-3 mb-3 rounded-lg border transition-all duration-200 cursor-pointer';
    
    if (isSelected) {
      return `${baseStyle} border-blue-500 bg-blue-50 shadow-md`;
    }
    
    switch (chunk.type) {
      case 'heading':
        return `${baseStyle} border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100`;
      case 'paragraph':
        return `${baseStyle} border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50`;
      case 'list_item':
        return `${baseStyle} border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 ml-4`;
      case 'table_cell':
        return `${baseStyle} border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50`;
      default:
        return `${baseStyle} border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50`;
    }
  };

  const getChunkHeader = (chunk: any) => {
    const chunkId = chunk.id || `chunk-${chunks.indexOf(chunk)}`;
    const icon = getChunkIcon(chunk.type);
    const typeLabel = chunk.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    return (
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{icon}</span>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {typeLabel}
          </span>
        </div>
        
        {chunk.metadata?.section_level && (
          <span className="text-xs text-gray-400">
            Level {chunk.metadata.section_level}
          </span>
        )}
        
        {chunk.metadata?.preceding_heading && (
          <span className="text-xs text-gray-400 bg-blue-100 px-2 py-1 rounded">
            Under: {chunk.metadata.preceding_heading}
          </span>
        )}
      </div>
    );
  };

  const renderChunkContent = (chunk: any) => {
    const content = chunk.content;
    
    // Handle different content types
    switch (chunk.type) {
      case 'heading':
        return (
          <h3 className="font-semibold text-gray-900">
            {content}
          </h3>
        );
      
      case 'list_item':
        return (
          <div className="flex items-start space-x-2">
            <span className="text-gray-400 mt-1">•</span>
            <span className="text-gray-700">{content}</span>
          </div>
        );
      
      case 'table_cell':
        return (
          <div className="bg-gray-50 p-2 rounded border">
            <span className="text-gray-700">{content}</span>
          </div>
        );
      
      default:
        return (
          <p className="text-gray-700 leading-relaxed">
            {content}
          </p>
        );
    }
  };

  const handleChunkClick = (chunk: any) => {
    const chunkId = chunk.id || `chunk-${chunks.indexOf(chunk)}`;
    onChunkSelect(chunkId);
  };

  if (!chunks || chunks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-4">📄</div>
        <p>No document content to display</p>
      </div>
    );
  }

  return (
    <div className="document-viewer-panel">
      {/* Document Summary */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">
          📊 Document Analysis Summary
        </h4>
        <div className="grid grid-cols-2 gap-4 text-xs text-blue-700">
          <div>
            <span className="font-medium">Total Sections:</span> {chunks.length}
          </div>
          <div>
            <span className="font-medium">Headings:</span> {chunks.filter(c => c.type === 'heading').length}
          </div>
          <div>
            <span className="font-medium">Paragraphs:</span> {chunks.filter(c => c.type === 'paragraph').length}
          </div>
          <div>
            <span className="font-medium">List Items:</span> {chunks.filter(c => c.type === 'list_item').length}
          </div>
        </div>
      </div>

      {/* Chunks List */}
      <div className="space-y-2">
        {chunks.map((chunk, index) => {
          const chunkId = chunk.id || `chunk-${index}`;
          const isSelected = selectedChunkId === chunkId;
          
          return (
            <div
              key={chunkId}
              data-chunk-id={chunkId}
              className={getChunkStyle(chunk, isSelected)}
              onClick={() => handleChunkClick(chunk)}
            >
              {getChunkHeader(chunk)}
              {renderChunkContent(chunk)}
              
              {/* Chunk Metadata */}
              {chunk.metadata && Object.keys(chunk.metadata).length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="flex flex-wrap gap-1">
                    {chunk.metadata.source_document_id && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        ID: {chunk.metadata.source_document_id.substring(0, 8)}...
                      </span>
                    )}
                    
                    {chunk.metadata.page_number && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        Page {chunk.metadata.page_number}
                      </span>
                    )}
                    
                    {chunk.metadata.list_type && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        {chunk.metadata.list_type} list
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation Help */}
      <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs text-gray-600 text-center">
          💡 Click on any section to highlight it in the BRD editor. 
          Use the right panel to review and refine the AI-generated structure.
        </p>
      </div>
    </div>
  );
};
