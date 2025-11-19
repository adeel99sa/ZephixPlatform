import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

interface CommandResult {
  type: 'navigation' | 'action' | 'query';
  title: string;
  description?: string;
  data?: any;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommandResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Listen for Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      
      if (isOpen) {
        if (e.key === 'Escape') {
          setIsOpen(false);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
          handleResultSelect(results[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search on query change
  useEffect(() => {
    if (query.length > 0) {
      const delaySearch = setTimeout(() => {
        performSearch();
      }, 300);
      
      return () => clearTimeout(delaySearch);
    } else {
      setResults([]);
    }
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/commands/search?q=${encodeURIComponent(query)}`);
      setResults(response.data);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Command search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultSelect = (result: CommandResult) => {
    if (result.type === 'navigation' && result.data?.route) {
      navigate(result.data.route);
    } else if (result.type === 'action' && result.data?.action) {
      // Handle action based on type
      console.log('Execute action:', result.data.action);
    }
    
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl">
        {/* Search Input */}
        <div className="p-4 border-b">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="w-full px-3 py-2 text-lg outline-none"
          />
        </div>

        {/* Results */}
        {loading ? (
          <div className="p-4 text-center text-gray-500">Searching...</div>
        ) : results.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                onClick={() => handleResultSelect(result)}
                className={`px-4 py-3 cursor-pointer flex items-center justify-between ${
                  index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div>
                  <div className="font-medium">{result.title}</div>
                  {result.description && (
                    <div className="text-sm text-gray-500">{result.description}</div>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {result.type === 'navigation' && '→'}
                  {result.type === 'action' && '⚡'}
                  {result.type === 'query' && '🔍'}
                </div>
              </div>
            ))}
          </div>
        ) : query.length > 0 ? (
          <div className="p-4 text-center text-gray-500">No results found</div>
        ) : (
          <div className="p-4">
            <div className="text-sm text-gray-500 mb-2">Quick Actions</div>
            <div className="space-y-2">
              <div className="px-3 py-2 hover:bg-gray-50 rounded cursor-pointer">Show overallocated resources</div>
              <div className="px-3 py-2 hover:bg-gray-50 rounded cursor-pointer">Create new task</div>
              <div className="px-3 py-2 hover:bg-gray-50 rounded cursor-pointer">Add KPI widget</div>
              <div className="px-3 py-2 hover:bg-gray-50 rounded cursor-pointer">Find available resources</div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-2 border-t text-xs text-gray-500 flex justify-between">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}










