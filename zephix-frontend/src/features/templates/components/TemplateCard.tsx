import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button/Button';
import { MoreVertical, Edit, Copy, Trash2, Star } from 'lucide-react';

interface TemplateCardProps {
  id: string;
  title: string;
  description: string;
  type: 'workspace' | 'project' | 'dashboard' | 'document' | 'form';
  onApply: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
}

export function TemplateCard({
  id,
  title,
  description,
  type,
  onApply,
  onEdit,
  onDuplicate,
  onDelete,
  onSetDefault
}: TemplateCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'workspace': return 'bg-blue-100 text-blue-800';
      case 'project': return 'bg-green-100 text-green-800';
      case 'dashboard': return 'bg-purple-100 text-purple-800';
      case 'document': return 'bg-orange-100 text-orange-800';
      case 'form': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow relative group">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(type)}`}>
            {type}
          </span>
        </div>
        {(onEdit || onDuplicate || onDelete || onSetDefault) && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              data-testid={`template-menu-${id}`}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                {onEdit && (
                  <button
                    onClick={(e) => { onEdit(e); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                    data-testid={`template-edit-${id}`}
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                )}
                {onDuplicate && (
                  <button
                    onClick={(e) => { onDuplicate(e); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                    data-testid={`template-duplicate-${id}`}
                  >
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </button>
                )}
                {onSetDefault && (
                  <button
                    onClick={(e) => { onSetDefault(e); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                    data-testid={`template-set-default-${id}`}
                  >
                    <Star className="h-4 w-4" />
                    Set as default
                  </button>
                )}
                {onDelete && (
                  <>
                    <div className="border-t my-1"></div>
                    <button
                      onClick={(e) => { onDelete(e); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                      data-testid={`template-delete-${id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-gray-600 text-sm mb-4">{description}</p>

      <Button
        onClick={(e) => {
          e?.stopPropagation();
          onApply();
        }}
        className="w-full"
        data-testid={`template-apply-${id}`}
      >
        Use in workspace
      </Button>
    </div>
  );
}
