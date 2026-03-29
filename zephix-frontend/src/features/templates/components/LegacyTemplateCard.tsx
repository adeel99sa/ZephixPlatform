import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button/Button';
import { MoreVertical, Edit, Copy, Trash2, Star } from 'lucide-react';

/** Legacy workspace-style template card (admin / grid tooling). */
interface LegacyTemplateCardProps {
  id: string;
  title: string;
  description: string;
  type: 'workspace' | 'project' | 'dashboard' | 'document' | 'form';
  onApply: () => void;
  onEdit?: (e?: React.MouseEvent) => void;
  onDuplicate?: (e?: React.MouseEvent) => void;
  onDelete?: (e?: React.MouseEvent) => void;
  onSetDefault?: (e?: React.MouseEvent) => void;
}

export function LegacyTemplateCard({
  id,
  title,
  description,
  type,
  onApply,
  onEdit,
  onDuplicate,
  onDelete,
  onSetDefault,
}: LegacyTemplateCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const getTypeColor = (t: string) => {
    switch (t) {
      case 'workspace':
        return 'bg-blue-100 text-blue-800';
      case 'project':
        return 'bg-green-100 text-green-800';
      case 'dashboard':
        return 'bg-purple-100 text-purple-800';
      case 'document':
        return 'bg-orange-100 text-orange-800';
      case 'form':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="relative group rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTypeColor(type)}`}
          >
            {type}
          </span>
        </div>
        {(onEdit || onDuplicate || onDelete || onSetDefault) && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded p-1 opacity-0 transition-opacity hover:bg-gray-100 group-hover:opacity-100"
              data-testid={`template-menu-${id}`}
              type="button"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      onEdit(e);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                    data-testid={`template-edit-${id}`}
                    type="button"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                )}
                {onDuplicate && (
                  <button
                    onClick={(e) => {
                      onDuplicate(e);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                    data-testid={`template-duplicate-${id}`}
                    type="button"
                  >
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </button>
                )}
                {onSetDefault && (
                  <button
                    onClick={(e) => {
                      onSetDefault(e);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                    data-testid={`template-set-default-${id}`}
                    type="button"
                  >
                    <Star className="h-4 w-4" />
                    Set as default
                  </button>
                )}
                {onDelete && (
                  <>
                    <div className="my-1 border-t" />
                    <button
                      onClick={(e) => {
                        onDelete(e);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      data-testid={`template-delete-${id}`}
                      type="button"
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

      <p className="mb-4 text-sm text-gray-600">{description}</p>

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
