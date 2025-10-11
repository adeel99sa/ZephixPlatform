import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import './TemplateSelector.css';

interface Template {
  id: string;
  name: string;
  methodology: string;
  description: string;
  defaultPhases: Array<{
    name: string;
    duration: number;
  }>;
  defaultKpis: Array<{
    name: string;
    type: string;
  }>;
  defaultViews: string[];
}

export const TemplateSelector: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  useEffect(() => {
    loadTemplates();
  }, []);
  
  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to view templates');
        setLoading(false);
        return;
      }
      
      // Use the api service which handles auth
      const response = await api.get('/templates');
      console.log('Templates loaded:', response.data);
      setTemplates(response.data);
      
    } catch (error: any) {
      console.error('Failed to load templates:', error);
      
      if (error.response?.status === 401) {
        setError('Session expired. Please login again.');
        setTimeout(() => navigate('/login'), 2000);
      } else if (error.response?.status === 403) {
        setError('You do not have permission to view templates');
      } else {
        setError('Failed to load templates. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const createProject = async () => {
    if (!selectedTemplate) {
      alert('Please select a template');
      return;
    }
    
    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }
    
    try {
      setCreating(true);
      setError('');
      
      const response = await api.post(`/templates/${selectedTemplate}/create-project`, {
        name: projectName,
        includeTasks: true
      });
      
      console.log('Project created:', response.data);
      
      if (response.data.success) {
        // Show success message briefly
        setSuccessMessage(`Project "${response.data.project.name}" created successfully!`);
        
        // Keep loading state visible during navigation
        setTimeout(() => {
          navigate(`/projects/${response.data.project.id}`, { 
            state: { newProject: true, fromTemplate: selectedTemplate.name }
          });
        }, 800);
      }
      
    } catch (error: any) {
      console.error('Failed to create project:', error);
      
      if (error.response?.status === 401) {
        setError('Your session has expired. Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else if (error.response?.status === 403) {
        setError('You do not have permission to create projects. Contact your administrator.');
      } else if (error.response?.status === 404) {
        setError('Template not found. It may have been deleted.');
      } else if (error.response?.status === 422) {
        setError('Invalid project data. Please check all required fields.');
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Failed to create project. Please try again or contact support.');
      }
    } finally {
      // Don't set creating to false here - we're navigating away
      // setCreating(false);
    }
  };
  
  const getMethodologyColor = (methodology: string) => {
    switch (methodology) {
      case 'waterfall': return '#3b82f6';
      case 'scrum': return '#10b981';
      case 'kanban': return '#f59e0b';
      case 'agile': return '#8b5cf6';
      default: return '#6b7280';
    }
  };
  
  if (loading) {
    return <div className="template-selector loading">Loading templates...</div>;
  }
  
  if (error) {
    return (
      <div className="template-selector error">
        <p className="error-message">{error}</p>
        <button onClick={loadTemplates} className="retry-btn">
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="template-selector">
      <h2>Create Project from Template</h2>
      
      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}
      
      {templates.length === 0 ? (
        <p>No templates available</p>
      ) : (
        <>
          <div className="project-name-input">
            <input
              type="text"
              placeholder="Enter project name..."
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="project-name"
            />
          </div>
      
      <div className="template-grid">
        {templates.map(template => (
          <div 
            key={template.id}
            className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
            onClick={() => setSelectedTemplate(template.id)}
            style={{ borderLeftColor: getMethodologyColor(template.methodology) }}
          >
            <div className="template-header">
              <h3>{template.name}</h3>
              <span className="methodology">{template.methodology}</span>
            </div>
            <p className="description">{template.description}</p>
            
            <div className="template-stats">
              <span>{template.defaultPhases?.length || 0} phases</span>
              <span>{template.defaultKpis?.length || 0} KPIs</span>
              <span>{template.defaultViews?.length || 0} views</span>
            </div>
            
          </div>
        ))}
      </div>
      
          <button 
            onClick={createProject} 
            className="create-btn"
            disabled={!selectedTemplate || !projectName.trim() || creating}
          >
            {creating ? 'Creating...' : 'Create Project'}
          </button>
        </>
      )}
    </div>
  );
};



