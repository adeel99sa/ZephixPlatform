import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';

interface Workspace {
  id: string;
  name: string;
  projectCount?: number;
}

export function WorkspacesSection() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isExpanded) {
      loadWorkspaces();
    }
  }, [isExpanded]);

  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      const response = await api.get('/workspaces');
      setWorkspaces(response.data.data || []);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceClick = (workspaceId: string) => {
    navigate(`/workspace/${workspaceId}`);
  };

  const handleCreateWorkspace = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/workspaces/create');
  };

  return (
    <div className="space-y-1">
      {/* Workspaces Header */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <Building2 size={18} />
          <span>Workspaces</span>
        </div>
      </button>

      {/* Expanded Workspaces List */}
      {isExpanded && (
        <div className="ml-8 space-y-1">
          {loading ? (
            <div className="text-xs text-gray-500 px-3 py-1">Loading...</div>
          ) : (
            <>
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleWorkspaceClick(workspace.id);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded"
                >
                  {workspace.name}
                  {workspace.projectCount !== undefined && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({workspace.projectCount})
                    </span>
                  )}
                </button>
              ))}

              {/* Create Workspace Button */}
              <button
                onClick={handleCreateWorkspace}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
              >
                <Plus size={14} />
                Create workspace
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}


