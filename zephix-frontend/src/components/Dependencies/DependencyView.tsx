import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import './DependencyView.css';

interface Dependency {
  id: string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  dependencyType: string;
  lagDays: number;
  isCriticalPath: boolean;
  createdAt: string;
}

interface DependencyStats {
  total: number;
  criticalPath: number;
  byType: Record<string, number>;
}

export const DependencyView: React.FC<{ projectId?: string }> = ({ projectId }) => {
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [stats, setStats] = useState<DependencyStats | null>(null);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadDependencies();
    loadStats();
  }, [projectId]);

  const loadDependencies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try API first, fallback to mock data
      try {
        const endpoint = projectId 
          ? `/dependencies/project/${projectId}`
          : '/dependencies';
        const response = await api.get(endpoint);
        setDependencies(response.data);
      } catch (apiError) {
        console.warn('API not available, using mock data:', apiError);
        setDependencies(getMockDependencies());
      }
    } catch (error) {
      console.error('Failed to load dependencies:', error);
      setError('Failed to load dependencies');
      setDependencies(getMockDependencies());
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/dependencies/stats');
      setStats(response.data);
    } catch (error) {
      console.warn('Failed to load stats, using mock data:', error);
      setStats({
        total: 5,
        criticalPath: 3,
        byType: {
          'finish_to_start': 4,
          'start_to_start': 1
        }
      });
    }
  };

  const getMockDependencies = (): Dependency[] => [
    {
      id: '1',
      sourceType: 'task',
      sourceId: 'task-1',
      targetType: 'task',
      targetId: 'task-2',
      dependencyType: 'finish_to_start',
      lagDays: 0,
      isCriticalPath: true,
      createdAt: '2025-09-30T10:00:00Z'
    },
    {
      id: '2',
      sourceType: 'task',
      sourceId: 'task-2',
      targetType: 'milestone',
      targetId: 'milestone-1',
      dependencyType: 'finish_to_start',
      lagDays: 2,
      isCriticalPath: true,
      createdAt: '2025-09-30T10:00:00Z'
    },
    {
      id: '3',
      sourceType: 'milestone',
      sourceId: 'milestone-1',
      targetType: 'project',
      targetId: 'project-1',
      dependencyType: 'finish_to_start',
      lagDays: 0,
      isCriticalPath: true,
      createdAt: '2025-09-30T10:00:00Z'
    },
    {
      id: '4',
      sourceType: 'task',
      sourceId: 'task-3',
      targetType: 'task',
      targetId: 'task-4',
      dependencyType: 'start_to_start',
      lagDays: 1,
      isCriticalPath: false,
      createdAt: '2025-09-30T10:00:00Z'
    },
    {
      id: '5',
      sourceType: 'task',
      sourceId: 'task-5',
      targetType: 'milestone',
      targetId: 'milestone-2',
      dependencyType: 'finish_to_finish',
      lagDays: 0,
      isCriticalPath: false,
      createdAt: '2025-09-30T10:00:00Z'
    }
  ];

  const getDependencyTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'finish_to_start': 'Finish → Start',
      'start_to_start': 'Start → Start',
      'finish_to_finish': 'Finish → Finish',
      'start_to_finish': 'Start → Finish'
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      'task': '📋',
      'milestone': '🎯',
      'project': '📁'
    };
    return icons[type] || '📄';
  };

  const filteredDependencies = dependencies.filter(dep => 
    !showCriticalPath || dep.isCriticalPath
  );

  if (loading) {
    return (
      <div className="dependency-view">
        <div className="loading">Loading dependencies...</div>
      </div>
    );
  }

  return (
    <div className="dependency-view">
      <div className="dependency-header">
        <h3>📊 Project Dependencies</h3>
        <div className="dependency-controls">
          <button 
            onClick={() => setShowCriticalPath(!showCriticalPath)}
            className={`toggle-btn ${showCriticalPath ? 'active' : ''}`}
          >
            {showCriticalPath ? 'Show All' : 'Show Critical Path'}
          </button>
          <button onClick={loadDependencies} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      {stats && (
        <div className="dependency-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Dependencies</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.criticalPath}</span>
            <span className="stat-label">Critical Path</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {Object.keys(stats.byType).length}
            </span>
            <span className="stat-label">Dependency Types</span>
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          ⚠️ {error} (Showing mock data)
        </div>
      )}

      {filteredDependencies.length === 0 ? (
        <div className="no-dependencies">
          ✅ No dependencies found
        </div>
      ) : (
        <div className="dependency-list">
          {filteredDependencies.map(dep => (
            <div 
              key={dep.id} 
              className={`dependency-item ${dep.isCriticalPath ? 'critical' : ''}`}
            >
              <div className="dependency-content">
                <div className="dependency-arrow">
                  <span className="source">
                    {getTypeIcon(dep.sourceType)} {dep.sourceType}
                  </span>
                  <span className="arrow">→</span>
                  <span className="target">
                    {getTypeIcon(dep.targetType)} {dep.targetType}
                  </span>
                </div>
                <div className="dependency-details">
                  <span className="dependency-type">
                    {getDependencyTypeLabel(dep.dependencyType)}
                  </span>
                  {dep.lagDays > 0 && (
                    <span className="lag-days">+{dep.lagDays} days</span>
                  )}
                  {dep.isCriticalPath && (
                    <span className="critical-badge">🚨 Critical</span>
                  )}
                </div>
              </div>
              <div className="dependency-actions">
                <button 
                  onClick={() => console.log('View impact', dep)}
                  className="action-btn"
                >
                  📈 Impact
                </button>
                <button 
                  onClick={() => console.log('Edit dependency', dep)}
                  className="action-btn"
                >
                  ✏️ Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="dependency-help">
        <h4>💡 Dependency Types</h4>
        <div className="help-grid">
          <div className="help-item">
            <strong>Finish → Start:</strong> Task B starts after Task A finishes
          </div>
          <div className="help-item">
            <strong>Start → Start:</strong> Both tasks start at the same time
          </div>
          <div className="help-item">
            <strong>Finish → Finish:</strong> Both tasks finish at the same time
          </div>
          <div className="help-item">
            <strong>Start → Finish:</strong> Task A starts when Task B finishes
          </div>
        </div>
      </div>
    </div>
  );
};
