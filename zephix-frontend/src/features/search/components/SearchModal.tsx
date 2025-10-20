import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useGlobalSearch } from '../hooks/useGlobalSearch';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { data: searchData, isLoading } = useGlobalSearch({ q: query });

  const results = searchData?.results || [];
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, typeof results>);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          navigate(results[selectedIndex].url);
          onClose();
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, navigate, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project':
        return '📁';
      case 'task':
        return '✅';
      case 'person':
        return '👤';
      default:
        return '📄';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'project':
        return 'Projects';
      case 'task':
        return 'Tasks';
      case 'person':
        return 'People';
      default:
        return 'Other';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl bg-white rounded-lg shadow-lg border border-gray-200">
        {/* Search Input */}
        <div className="flex items-center p-4 border-b border-gray-200">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, tasks, people..."
            className="flex-1 text-lg border-none outline-none placeholder-gray-500"
          />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 ml-3"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto" ref={resultsRef}>
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : query.trim() === '' ? (
            <div className="p-4 text-center text-gray-500">Start typing to search</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No results found</div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedResults).map(([type, typeResults]) => (
                <div key={type} className="mb-4">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {getTypeLabel(type)}
                  </div>
                  {typeResults.map((result, index) => {
                    const globalIndex = results.indexOf(result);
                    const isSelected = globalIndex === selectedIndex;
                    
                    return (
                      <button
                        key={result.id}
                        onClick={() => {
                          navigate(result.url);
                          onClose();
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <span className="text-lg mr-3">{getTypeIcon(result.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {result.title}
                          </div>
                          {result.description && (
                            <div className="text-sm text-gray-500 truncate">
                              {result.description}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span>Press Enter to select, ↑↓ to navigate, Esc to close</span>
            <span>⌘K to open</span>
          </div>
        </div>
      </div>
    </div>
  );
};
