import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PaperAirplaneIcon, 
  PlusIcon, 
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  UsersIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/authStore';
import { useProjectStore } from '../../stores/projectStore';
import { projectsApi } from '../../services/api';
import { aiService, type AIResponse } from '../../services/aiService';
import type { Project } from '../../types';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  action?: AIResponse['action'];
}

export const AIDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const { projects, setProjects } = useProjectStore();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: `Hello ${user?.firstName || 'there'}! 👋 I'm your AI assistant. I can help you manage projects, create tasks, analyze data, and much more. What would you like to work on today?`,
      timestamp: new Date()
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProjects();
    scrollToBottom();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadProjects = async () => {
    try {
      const response = await projectsApi.getAll();
      setProjects(response.projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      // Use the AI service to process the message
      const aiResponse = await aiService.processMessage(inputValue, {
        projects,
        user
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse.content,
        timestamp: new Date(),
        action: aiResponse.action
      };

      setMessages(prev => [...prev, aiMessage]);

      // Handle AI actions
      if (aiResponse.action) {
        handleAIAction(aiResponse.action);
      }
    } catch (error) {
      console.error('AI processing error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAIAction = (action: AIResponse['action']) => {
    if (!action) return;

    switch (action.type) {
      case 'create_project':
        navigate('/projects');
        toast.success('Navigating to project creation...');
        break;
      case 'show_projects':
        navigate('/projects');
        toast.success('Showing your projects...');
        break;
      case 'analytics':
        // Could navigate to analytics page or show analytics modal
        toast.success('Loading analytics...');
        break;
      case 'logout':
        handleLogout();
        break;
      case 'navigate':
        if (action.data?.section === 'help') {
          toast.success('Showing help information...');
        }
        break;
    }
  };

  const handleLogout = () => {
    clearAuth();
    toast.success('Successfully logged out');
    navigate('/login');
  };

  const handleCreateProject = () => {
    navigate('/projects');
  };

  const handleQuickAction = (action: string) => {
    setInputValue(action);
    // Trigger the send message after a short delay
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Zephix AI</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleCreateProject}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Project
              </button>
              
              <div className="relative">
                <button className="flex items-center space-x-2 text-gray-700 hover:text-gray-900">
                  <UserCircleIcon className="w-6 h-6" />
                  <span className="hidden sm:block">{user?.firstName} {user?.lastName}</span>
                </button>
              </div>
              
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-600"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
                <p className="text-sm text-gray-500">Ask me anything about your projects and workflow</p>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
              
              {/* Input */}
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex space-x-4">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask me anything about your projects..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={isProcessing}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isProcessing}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PaperAirplaneIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => handleQuickAction('Create a new project')}
                    className="w-full flex items-center space-x-3 p-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <PlusIcon className="w-5 h-5 text-indigo-600" />
                    <span>Create Project</span>
                  </button>
                  
                  <button
                    onClick={() => handleQuickAction('Show me my projects')}
                    className="w-full flex items-center space-x-3 p-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <DocumentTextIcon className="w-5 h-5 text-green-600" />
                    <span>View Projects</span>
                  </button>
                  
                  <button
                    onClick={() => handleQuickAction('Show me project analytics')}
                    className="w-full flex items-center space-x-3 p-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <ChartBarIcon className="w-5 h-5 text-blue-600" />
                    <span>Analytics</span>
                  </button>
                  
                  <button
                    onClick={() => handleQuickAction('What can you help me with?')}
                    className="w-full flex items-center space-x-3 p-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <ChatBubbleLeftRightIcon className="w-5 h-5 text-purple-600" />
                    <span>AI Help</span>
                  </button>
                </div>
              </div>
              
              {/* Project Stats */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Overview</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Projects</span>
                    <span className="text-2xl font-bold text-indigo-600">{projects.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Active Projects</span>
                    <span className="text-lg font-semibold text-green-600">
                      {projects.filter(p => p.status === 'active').length}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Recent Projects */}
              {projects.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Projects</h3>
                  <div className="space-y-3">
                    {projects.slice(0, 3).map((project) => (
                      <div
                        key={project.id}
                        className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => navigate('/projects')}
                      >
                        <h4 className="font-medium text-gray-900">{project.name}</h4>
                        <p className="text-sm text-gray-500 truncate">
                          {project.description || 'No description'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
