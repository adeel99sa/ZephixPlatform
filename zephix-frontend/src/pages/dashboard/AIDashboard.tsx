import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useUser } from '../../hooks/useUser';
import { useProjectStore } from '../../stores/projectStore';
import { aiService, type AIResponse } from '../../services/aiService';
import { DashboardHeader, ChatInterface, DashboardSidebar } from '../../components/dashboard';
import { Skeleton, SkeletonList, SkeletonCard } from '../../components/ui/Skeleton';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  action?: AIResponse['action'];
}

interface AIDashboardProps {
  // Add props here if needed in the future
}

export const AIDashboard: React.FC<AIDashboardProps> = memo(() => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { projects, fetchProjects } = useProjectStore();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: `Hello ${user?.firstName || 'there'}! 👋 I'm your AI assistant. I can help you manage projects, create tasks, analyze data, and more. What would you like to work on today?`,
      timestamp: new Date(),
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      setIsInitialLoading(true);
      const result = await fetchProjects();
      if (!result.success && result.error) {
        console.error('Failed to load projects:', result.error.message);
        toast.error('Failed to load projects');
      }
      setIsInitialLoading(false);
    };
    loadProjects();
  }, [fetchProjects]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      const aiResponse = await aiService.processMessage(inputValue, { projects, user });
      const aiMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'ai',
        content: aiResponse.content,
        timestamp: new Date(),
        action: aiResponse.action,
      };
      setMessages((prev) => prev.filter(msg => !msg.isLoading).concat(aiMessage));
      if (aiResponse.action) handleAIAction(aiResponse.action);
    } catch (error) {
      setMessages((prev) => prev.filter(msg => !msg.isLoading).concat({
        id: (Date.now() + 2).toString(),
        type: 'ai',
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      }));
      console.error('AI processing error:', error);
      toast.error('Failed to process message');
    } finally {
      setIsProcessing(false);
    }
  }, [inputValue, isProcessing, projects, user]);

  const handleAIAction = useCallback(async (action: AIResponse['action']) => {
    if (!action) return;
    switch (action.type) {
      case 'create_project':
        navigate('/projects');
        toast.success('Navigating to project creation...');
        break;
      case 'show_projects':
        navigate('/projects');
        toast.success('Navigating to projects...');
        break;
      case 'logout':
        navigate('/auth/login');
        toast.success('Logged out successfully');
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, [navigate]);

  const handleCreateProject = useCallback(() => {
    navigate('/projects');
  }, [navigate]);

  const handleQuickAction = useCallback((text: string) => {
    setInputValue(text);
  }, []);

  const handleProjectClick = useCallback(() => {
    navigate('/projects');
  }, [navigate]);

  // Show skeleton loaders during initial load
  if (isInitialLoading) {
    return (
      <div className="min-h-[calc(100vh-80px)]">
        <div className="flex h-[calc(100vh-80px)]">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header Skeleton */}
            <div className="bg-gray-800 border-b border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <Skeleton variant="text" size="lg" width="200px" />
                <Skeleton variant="rectangular" size="md" width="100px" height="40px" />
              </div>
            </div>
            
            {/* Chat Interface Skeleton */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 p-6">
                <div className="space-y-4">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              </div>
            </div>
          </div>
          
          {/* Sidebar Skeleton */}
          <div className="w-80 bg-gray-800 border-l border-gray-700 p-6">
            <SkeletonList items={5} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)]">
      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <DashboardHeader onCreateProject={handleCreateProject} />
          
          <ChatInterface
            messages={messages.map(msg => ({
              id: msg.id,
              content: msg.content,
              isUser: msg.type === 'user',
              timestamp: msg.timestamp
            }))}
            onSendMessage={handleSendMessage}
            isLoading={isProcessing}
          />
        </div>
        
        {/* Sidebar */}
        <DashboardSidebar
          onQuickAction={handleQuickAction}
          onProjectClick={handleProjectClick}
        />
      </div>
    </div>
  );
});

AIDashboard.displayName = 'AIDashboard';
