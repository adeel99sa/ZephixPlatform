import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from 'react-router-dom';
import { ArrowUp, Bot, BrainCircuit, CheckCircle2, ChevronRight, FileText, GitBranch, HardHat, Loader2, Plus, Sparkles, User, X, Zap, AlertTriangle, Calendar, Clock, Users, TrendingUp, Shield, Upload } from 'lucide-react';

// Import existing stores and utilities
import { mockApi } from './stores/mockApi';
import { useProjectStore } from './stores/projectStore';
import { useUIStore } from './stores/uiStore';
import { getInitials, formatDate, truncate } from './utils';
import type { Message, Project } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingPage } from './pages/LandingPage';

// Utility function to replace clsx
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Performance monitoring utility
const logPerformance = (operation: string, startTime: number, data?: any) => {
  const endTime = performance.now();
  const duration = endTime - startTime;
  console.log(`⏱️ Performance: ${operation} completed in ${duration.toFixed(2)}ms`);
  if (data) {
    console.log(`📊 Performance: ${operation} data:`, data);
  }
};

// --- ENHANCED UI COMPONENTS ---

const ProjectCard = React.memo(({ project, onClick }: { project: Project, onClick: () => void }) => {
  const healthColor = {
    'On Track': 'bg-green-500',
    'At Risk': 'bg-yellow-500',
    'Off Track': 'bg-red-500',
  }[project.health];

  const priorityColor = {
    'High': 'text-red-300',
    'Medium': 'text-yellow-300',
    'Low': 'text-green-300',
  }[project.priority];

  const statusIcon = {
    'Planning': Calendar,
    'Building': HardHat,
    'Review': Shield,
    'Complete': CheckCircle2,
  }[project.status];

  const Icon = statusIcon;

  return (
    <div 
      onClick={onClick}
      className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 cursor-pointer hover:bg-slate-800 transition-all duration-300 group hover:border-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-indigo-400" />
          <h3 className="font-bold text-slate-100 text-sm">{truncate(project.name, 30)}</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`font-medium ${priorityColor}`}>{project.priority}</span>
          <div className={`w-2 h-2 rounded-full ${healthColor}`} />
        </div>
      </div>
      
      <div className="mt-2 flex justify-between items-center text-xs">
        <span className="text-slate-400">{project.category}</span>
        <span className="text-slate-500">{project.status}</span>
      </div>

      <div className="w-full bg-slate-700 rounded-full h-2 mt-4">
        <div 
          className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2 rounded-full transition-all duration-500" 
          style={{ width: `${project.progress}%` }}
          role="progressbar"
          aria-valuenow={project.progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      
      <div className="flex justify-between text-xs text-slate-500 mt-2">
        <span>Progress</span>
        <span>{project.progress}%</span>
      </div>

      {project.team && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex -space-x-1">
            {project.team.slice(0, 3).map((member) => (
              <div
                key={member.id}
                className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-800 bg-indigo-500 flex items-center justify-center text-xs font-semibold text-white"
                title={member.name}
              >
                {member.avatar}
              </div>
            ))}
            {project.team.length > 3 && (
              <div className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-800 bg-slate-600 flex items-center justify-center text-xs font-semibold text-slate-300">
                +{project.team.length - 3}
              </div>
            )}
          </div>
          <div className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center">
            View Details <ChevronRight className="w-3 h-3 ml-1" />
          </div>
        </div>
      )}

      {project.deadline && (
        <div className="mt-2 flex items-center text-xs text-slate-500">
          <Clock className="w-3 h-3 mr-1" />
          Due {formatDate(project.deadline)}
        </div>
      )}
    </div>
  );
});

const ChatBubble = React.memo(({ message }: { message: Message }) => {
  const isUser = message.sender === 'user';
  const bubbleColor = {
    'text': isUser ? 'bg-blue-600' : 'bg-slate-700',
    'project': 'bg-indigo-600/20 border border-indigo-500/30',
    'error': 'bg-red-600/20 border border-red-500/30',
    'success': 'bg-green-600/20 border border-green-500/30',
  }[message.type || 'text'];

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}
      <div className={`max-w-2xl p-4 rounded-2xl ${isUser ? 'bg-blue-600 text-white rounded-br-none' : `${bubbleColor} text-slate-200 rounded-bl-none`}`}>
        <p className="text-sm leading-relaxed">{message.text}</p>
        <div className="text-xs opacity-70 mt-2">
          {message.timestamp.toLocaleTimeString()}
        </div>
        
        {message.project && (
          <div className="mt-4 border-t border-slate-600/50 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-400">Project Blueprint Generated</p>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full">
                {message.project.status}
              </span>
            </div>
            
            <div className="bg-slate-800/80 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-white">{message.project.name}</h4>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-medium">{message.project.progress}%</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400">Priority:</span>
                  <span className="ml-1 font-medium text-white">{message.project.priority}</span>
                </div>
                <div>
                  <span className="text-slate-400">Team:</span>
                  <span className="ml-1 font-medium text-white">{message.project.team.length} members</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-medium">Key Milestones:</p>
                {message.project.milestones.slice(0, 3).map((m) => (
                  <div key={m.id} className="flex items-center text-xs">
                    <CheckCircle2 className={cn(
                      "w-3 h-3 mr-2 flex-shrink-0",
                      m.status === 'done' ? 'text-green-500' : 
                      m.status === 'inprogress' ? 'text-yellow-500' :
                      m.status === 'blocked' ? 'text-red-500' : 'text-slate-600'
                    )} />
                    <span className={m.status === 'done' ? 'text-slate-300' : 'text-slate-400'}>
                      {m.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

const ChatInput = ({ onSend, loading }: { onSend: (text: string) => void, loading: boolean }) => {
  const [inputValue, setInputValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const handleSend = useCallback(() => {
    if (inputValue.trim().length < 3) {
      setError('Message must be at least 3 characters');
      return;
    }
    if (inputValue.trim()) {
      onSend(inputValue.trim());
      setInputValue('');
      setError('');
    }
  }, [inputValue, onSend]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    console.log('Files dropped:', files);
    // Handle file upload logic here
    if (files.length > 0) {
      onSend(`Uploaded BRD: "${files[0].name}"`);
    }
  };

  return (
    <div className="p-4 bg-slate-900 border-t border-slate-800">
      <div 
        className={cn(
          "relative rounded-2xl border-2 border-dashed transition-colors",
          isDragging ? "border-indigo-400 bg-indigo-500/10" : "border-transparent"
        )}
        onDragEnter={handleDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError('');
            }}
            onKeyPress={handleKeyPress}
            placeholder="Tell me what you want to build, or drag & drop a BRD..."
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-6 pr-24 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            disabled={loading}
          />
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
            <button 
              type="button"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-colors"
              title="Upload file"
            >
              <Upload className="w-5 h-5" />
            </button>
            
            <button 
              onClick={handleSend}
              className="bg-indigo-600 rounded-xl p-2 hover:bg-indigo-500 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
              disabled={loading || !inputValue?.trim()}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <ArrowUp className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>
        
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-indigo-500/10 rounded-2xl">
            <div className="text-center">
              <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
              <p className="text-sm text-indigo-300 font-medium">Drop your BRD here</p>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-red-400 text-xs mt-2 flex items-center">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {error}
        </p>
      )}
    </div>
  );
};

// Custom Modal Component (replacing Headless UI)
const Modal = ({ isOpen, onClose, children }: { isOpen: boolean, onClose: () => void, children: React.ReactNode }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative transform transition-all duration-300 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

const ProjectBlueprintModal = ({ project, isOpen, onClose }: { project: Project | null, isOpen: boolean, onClose: () => void }) => {
  if (!project) return null;

  const healthColor = {
    'On Track': 'text-green-400 border-green-400/50 bg-green-500/10',
    'At Risk': 'text-yellow-400 border-yellow-400/50 bg-yellow-500/10',
    'Off Track': 'text-red-400 border-red-400/50 bg-red-500/10',
  }[project.health];

  const riskColors = {
    'High': 'bg-red-500/20 text-red-300 border-red-500/30',
    'Medium': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    'Low': 'bg-green-500/20 text-green-300 border-green-500/30',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-8 text-left shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-3xl font-bold text-white flex items-center">
            <GitBranch className="w-8 h-8 mr-3 text-indigo-400"/>
            {project.name}
          </h3>
          <button 
            onClick={onClose} 
            className="text-slate-500 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6"/>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content - 3 columns */}
          <div className="lg:col-span-3 space-y-8">
            {/* Project Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <h4 className="text-sm font-semibold text-indigo-400 mb-2">Status</h4>
                <p className="text-2xl font-bold text-white">{project.status}</p>
                <div className={`mt-2 inline-flex px-3 py-1 text-sm font-medium rounded-full border ${healthColor}`}>
                  {project.health}
                </div>
              </div>
              
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <h4 className="text-sm font-semibold text-indigo-400 mb-2">Progress</h4>
                <p className="text-2xl font-bold text-white">{project.progress}%</p>
                <div className="w-full bg-slate-700 rounded-full h-2 mt-3">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2 rounded-full transition-all duration-500" 
                    style={{width: `${project.progress}%`}}
                  />
                </div>
              </div>

              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <h4 className="text-sm font-semibold text-indigo-400 mb-2">Priority</h4>
                <p className="text-2xl font-bold text-white">{project.priority}</p>
                {project.deadline && (
                  <p className="text-sm text-slate-400 mt-1">
                    Due {formatDate(project.deadline)}
                  </p>
                )}
              </div>
            </div>

            {/* Milestones */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                <HardHat className="w-5 h-5 mr-2 text-indigo-400"/>
                Project Milestones
              </h4>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-6 space-y-4">
                  {project.milestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircle2 className={cn(
                          "w-6 h-6 mr-3 flex-shrink-0",
                          milestone.status === 'done' ? 'text-green-500' : 
                          milestone.status === 'inprogress' ? 'text-yellow-500 animate-pulse' :
                          milestone.status === 'blocked' ? 'text-red-500' : 'text-slate-600'
                        )} />
                        <div>
                          <p className="font-medium text-white">{milestone.name}</p>
                          {milestone.assignee && (
                            <p className="text-sm text-slate-400">Assigned to {milestone.assignee}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize",
                          milestone.status === 'done' ? 'bg-green-500/20 text-green-300' :
                          milestone.status === 'inprogress' ? 'bg-yellow-500/20 text-yellow-300' :
                          milestone.status === 'blocked' ? 'bg-red-500/20 text-red-300' :
                          'bg-slate-500/20 text-slate-300'
                        )}>
                          {milestone.status === 'inprogress' ? 'In Progress' : milestone.status}
                        </span>
                        {milestone.dueDate && (
                          <p className="text-xs text-slate-500 mt-1">
                            Due {formatDate(milestone.dueDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* AI Health Monitor */}
            <div>
              <h4 className="text-sm font-semibold text-indigo-400 mb-3 flex items-center">
                <BrainCircuit className="w-4 h-4 mr-2"/>
                AI Health Monitor
              </h4>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-4">
                <div className="text-center">
                  <div className={`inline-flex px-3 py-2 text-sm font-semibold rounded-full border ${healthColor}`}>
                    {project.health}
                  </div>
                </div>

                {project.risks.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-2 flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Risks Identified
                    </p>
                    <div className="space-y-2">
                      {project.risks.map((risk) => (
                        <div key={risk.id} className={`p-3 rounded-lg border text-xs ${riskColors[risk.severity]}`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium">{risk.severity} Risk</span>
                            <span className="text-xs opacity-75">{risk.probability} Probability</span>
                          </div>
                          <p>{risk.description}</p>
                          {risk.mitigation && (
                            <p className="mt-2 text-xs opacity-90">
                              <strong>Mitigation:</strong> {risk.mitigation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {project.opportunities.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-2 flex items-center">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Opportunities
                    </p>
                    <div className="space-y-2">
                      {project.opportunities.map((opportunity) => (
                        <div key={opportunity.id} className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-xs">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-green-300">{opportunity.potential} Impact</span>
                            <span className="text-xs text-green-400 opacity-75">{opportunity.effort} Effort</span>
                          </div>
                          <p className="text-green-200">{opportunity.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Team */}
            <div>
              <h4 className="text-sm font-semibold text-indigo-400 mb-3 flex items-center">
                <Users className="w-4 h-4 mr-2"/>
                Team ({project.team.length})
              </h4>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-3">
                {project.team.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-semibold text-white mr-3">
                        {member.avatar}
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{member.name}</p>
                        <p className="text-xs text-slate-400">{member.role}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      member.availability === 'Available' ? 'bg-green-500' :
                      member.availability === 'Busy' ? 'bg-yellow-500' : 'bg-red-500'
                    )} title={member.availability} />
                  </div>
                ))}
              </div>
            </div>

            {/* Budget & Timeline */}
            {(project.budget || project.deadline) && (
              <div>
                <h4 className="text-sm font-semibold text-indigo-400 mb-3">Project Details</h4>
                <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-3">
                  {project.budget && (
                    <div>
                      <p className="text-xs text-slate-400">Budget</p>
                      <p className="font-semibold text-white">${project.budget.toLocaleString()}</p>
                    </div>
                  )}
                  {project.deadline && (
                    <div>
                      <p className="text-xs text-slate-400">Deadline</p>
                      <p className="font-semibold text-white">{formatDate(project.deadline)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
          <button
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Export Blueprint
          </button>
        </div>
      </div>
    </Modal>
  );
};

// --- MAIN ENHANCED APP ---
const AppContent = () => {
  // State management with Zustand stores
  const { projects, isLoading, error, fetchProjects, addProject } = useProjectStore();
  const { blueprintModalProjectId, openBlueprintModal, closeBlueprintModal } = useUIStore();
  
  // Local state for chat
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 1, 
      sender: 'ai', 
      text: "Welcome to Zephix, your AI project co-pilot. I'm here to transform your Business Requirements Documents into comprehensive project plans. To get started, describe what you want to build or upload your BRD document.",
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Effects
  useEffect(() => {
    console.log('🚀 App: Initializing application...');
    const startTime = performance.now();
    
    fetchProjects().finally(() => {
      const endTime = performance.now();
      logPerformance('App initialization', startTime, { 
        projectsLoaded: projects.length,
        messagesCount: messages.length 
      });
    });
  }, [fetchProjects]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Memoized values for performance
  const selectedProject = useMemo(() => 
    projects.find(p => p.id === blueprintModalProjectId) || null,
    [projects, blueprintModalProjectId]
  );
  
  const memoizedProjects = useMemo(() => projects, [projects]);
  const memoizedMessages = useMemo(() => messages, [messages]);

  // Event handlers with performance monitoring
  const handleSend = useCallback(async (text: string) => {
    const startTime = performance.now();
    console.log('💬 App: Processing user message:', text.substring(0, 50) + '...');
    
    const newUserMessage: Message = { 
      id: Date.now(), 
      sender: 'user', 
      text, 
      timestamp: new Date(),
      type: 'text'
    };
    setMessages(prev => [...prev, newUserMessage]);
    setIsAiThinking(true);

    try {
        const newProject = await mockApi.createProject(text);
        addProject(newProject);

        const responses = [
            `Perfect! I've analyzed your request and created an initial project blueprint for "${newProject.name}". I've structured this as a ${newProject.category.toLowerCase()} initiative with ${newProject.priority.toLowerCase()} priority. The plan includes ${newProject.milestones.length} key milestones and I've identified some initial risks and opportunities for us to consider.`,
            `Excellent! Based on your description, I've generated a comprehensive project framework. I've set this up as a ${newProject.status.toLowerCase()} phase project with estimated ${newProject.progress}% initial progress. The blueprint includes detailed milestones, risk assessments, and team structure recommendations.`,
            `Great idea! I've transformed your concept into a structured project plan with industry-standard methodologies. This ${newProject.category.toLowerCase()} project has been prioritized as ${newProject.priority.toLowerCase()} and includes built-in risk mitigation strategies.`
        ];
        
        const newAiMessage: Message = {
            id: Date.now() + 1,
            sender: 'ai',
            text: responses[Math.floor(Math.random() * responses.length)],
            timestamp: new Date(),
            project: newProject,
            type: 'project'
        };
        setMessages(prev => [...prev, newAiMessage]);

        logPerformance('Message processing', startTime, { 
          projectCreated: newProject.name,
          teamSize: newProject.team.length,
          milestonesCount: newProject.milestones.length 
        });

    } catch (error) {
        const errorAiMessage: Message = {
            id: Date.now() + 1,
            sender: 'ai',
            text: "I'm sorry, I encountered an error while creating the project. Please try again.",
            timestamp: new Date(),
            type: 'error'
        };
        setMessages(prev => [...prev, errorAiMessage]);
        
        console.error('❌ App: Error processing message:', error);
        logPerformance('Message processing (error)', startTime, { error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
        setIsAiThinking(false);
    }
  }, [addProject]);

  const handleCreateProject = useCallback(() => {
    console.log('➕ App: Creating new project via quick action');
    handleSend('New Strategic Initiative');
  }, [handleSend]);

  const openProjectModal = useCallback((project: Project) => {
    openBlueprintModal(project.id);
  }, [openBlueprintModal]);

  return (
    <div className="h-screen w-screen bg-slate-900 text-white font-sans flex antialiased">
      {/* Enhanced Sidebar */}
      <aside className="w-96 bg-black/20 flex flex-col border-r border-slate-800">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mr-3">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">Zephix</h1>
          <span className="ml-2 text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">AI Co-pilot</span>
        </div>
        
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center">
              <GitBranch className="w-4 h-4 mr-2" />
              Projects ({memoizedProjects.length})
            </h2>
            <button 
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              onClick={handleCreateProject}
              title="Create new project"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            {isLoading ? (
                <div className="text-center text-slate-400">Loading projects...</div>
            ) : error ? (
                <div className="text-center text-red-400">{error}</div>
            ) : (
                memoizedProjects.map(project => (
                    <ProjectCard key={project.id} project={project} onClick={() => openProjectModal(project)} />
                ))
            )}
          </div>
        </div>
        
        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-lg font-bold text-white">
              A
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-200">Adeel Malik</p>
              <p className="text-xs text-slate-500">Program Manager</p>
            </div>
            <div className="ml-auto">
              <div className="w-2 h-2 rounded-full bg-green-500" title="Available" />
            </div>
          </div>
        </div>
      </aside>

      {/* Enhanced Main Content */}
      <main className="flex-1 flex flex-col">
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h2 className="text-lg font-semibold text-slate-200 flex items-center">
              <Bot className="w-5 h-5 mr-2 text-indigo-400" />
              AI Co-pilot
            </h2>
            <p className="text-xs text-slate-500">Transform your ideas into project blueprints</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-slate-800 p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Upload document">
              <FileText className="w-5 h-5"/>
            </button>
            <button 
              onClick={() => handleSend('Enterprise Software Migration Project')} 
              className="bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:from-indigo-500 hover:to-blue-500 transition-all shadow-lg"
            >
              <Zap className="w-4 h-4"/>
              Quick Start
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {memoizedMessages.map(msg => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          {isAiThinking && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="max-w-md p-4 rounded-2xl bg-slate-700 text-slate-200 rounded-bl-none">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400"/>
                  <div className="space-y-1">
                    <span className="text-sm text-slate-300">Zephix is analyzing your request...</span>
                    <div className="flex gap-1">
                      <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        
        <ChatInput onSend={handleSend} loading={isAiThinking} />
      </main>

      <ProjectBlueprintModal 
        isOpen={!!selectedProject} 
        onClose={closeBlueprintModal} 
        project={selectedProject} 
      />
    </div>
  );
};

// Wrap the main app with error boundary and router
export default function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('🚨 App Error Boundary caught error:', {
          error: error.message,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        });
      }}
    >
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<AppContent />} />
          {/* keep any other existing <Route> definitions here */}
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}