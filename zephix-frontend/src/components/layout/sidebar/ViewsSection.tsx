import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const ViewsSection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const views = [
    { icon: '📅', label: 'Timeline', path: '/timeline' },
    { icon: '🔥', label: 'Heatmap', path: '/heatmap' },
    { icon: '📊', label: 'Kanban', path: '/kanban' },
  ];

  return (
    <div>
      <div className="px-3 py-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Views
        </span>
      </div>

      <div className="space-y-1">
        {views.map(view => (
          <button
            key={view.path}
            onClick={() => navigate(view.path)}
            className={`
              w-full flex items-center px-3 py-2 rounded-md text-sm font-medium
              ${location.pathname === view.path
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
              }
            `}
          >
            <span className="mr-3">{view.icon}</span>
            <span>{view.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

