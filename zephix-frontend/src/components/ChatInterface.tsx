import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, SparklesIcon, BrainIcon, LightBulbIcon, ChartBarIcon, ExclamationTriangleIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Button } from './ui/Button';
import { aiApi, apiJson } from '../services/api';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  projectId?: string;
  aiInsights?: any;
  suggestedActions?: Array<{
    type: string;
    title: string;
    description: string;
    data?: any;
  }>;
  followUpQuestions?: string[];
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  message: string;
}

interface ChatInterfaceProps {
  projectId?: string;
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  projectId,
  className = '',
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load quick actions when component mounts
    loadQuickActions();
  }, []);

  const loadQuickActions = async () => {
    try {
      const response = await apiJson('/ai-chat/quick-actions');
      setQuickActions(response.actions);
    } catch (error) {
      console.error('Failed to load quick actions:', error);
      // Set default quick actions
      setQuickActions([
        {
          id: 'analyze_project',
          title: 'Analyze Project',
          description: 'Get comprehensive project analysis with AI insights',
          icon: '📊',
          category: 'analysis',
          message: 'Analyze my current project and provide insights'
        },
        {
          id: 'create_project',
          title: 'Create Project',
          description: 'Start a new project with AI-powered planning',
          icon: '🚀',
          category: 'creation',
          message: 'Help me create a new project'
        },
        {
          id: 'optimize_resources',
          title: 'Optimize Resources',
          description: 'Optimize team allocation and identify skill gaps',
          icon: '⚡',
          category: 'optimization',
          message: 'Optimize resources for my project'
        },
        {
          id: 'assess_risks',
          title: 'Assess Risks',
          description: 'Identify and analyze project risks',
          icon: '⚠️',
          category: 'risk',
          message: 'Assess risks in my project'
        },
        {
          id: 'plan_communication',
          title: 'Plan Communication',
          description: 'Create stakeholder communication plans',
          icon: '📢',
          category: 'communication',
          message: 'Plan communication for my project'
        },
        {
          id: 'monitor_health',
          title: 'Monitor Health',
          description: 'Track project health and performance',
          icon: '📈',
          category: 'monitoring',
          message: 'Monitor the health of my project'
        }
      ]);
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputValue.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: textToSend,
      isUser: true,
      timestamp: new Date(),
      projectId,
    };

    setMessages(prev => [...prev, userMessage]);
    if (!messageText) {
      setInputValue('');
    }
    setIsLoading(true);

    try {
      const data = await apiJson('/ai-chat/send-message', {
        method: 'POST',
        body: {
          message: textToSend,
          context: {
            userId: 'current-user', // This would come from auth context
            projectId,
          },
        },
      });
      
      const aiMessage: Message = {
        id: data.messageId,
        content: data.response,
        isUser: false,
        timestamp: new Date(),
        projectId,
        aiInsights: data.aiInsights,
        suggestedActions: data.suggestedActions,
        followUpQuestions: data.followUpQuestions,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    handleSendMessage(action.message);
    setShowQuickActions(false);
  };

  const handleSuggestedAction = (action: any) => {
    // Handle suggested action from AI response
    console.log('Suggested action:', action);
    toast.success(`Action triggered: ${action.title}`);
  };

  const handleFollowUpQuestion = (question: string) => {
    handleSendMessage(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessageContent = (message: Message) => {
    // Convert markdown-like formatting to HTML
    const formattedContent = message.content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/## (.*?)\n/g, '<h2 class="text-lg font-bold mb-2">$1</h2>')
      .replace(/\n/g, '<br>');

    return (
      <div 
        className="text-sm"
        dangerouslySetInnerHTML={{ __html: formattedContent }}
      />
    );
  };

  const renderSuggestedActions = (actions: any[]) => {
    return (
      <div className="mt-4 space-y-2">
        <p className="text-xs text-gray-500 font-medium">Suggested Actions:</p>
        <div className="flex flex-wrap gap-2">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleSuggestedAction(action)}
              className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full hover:bg-indigo-200 transition-colors"
            >
              {action.title}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderFollowUpQuestions = (questions: string[]) => {
    return (
      <div className="mt-4 space-y-2">
        <p className="text-xs text-gray-500 font-medium">Follow-up Questions:</p>
        <div className="space-y-1">
          {questions.map((question, index) => (
            <button
              key={index}
              onClick={() => handleFollowUpQuestion(question)}
              className="block w-full text-left px-3 py-2 bg-gray-50 text-gray-700 text-xs rounded hover:bg-gray-100 transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <BrainIcon className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-medium text-gray-900">Zephix AI Assistant</h3>
          {projectId && (
            <span className="text-sm text-gray-500">(Project Context)</span>
          )}
        </div>
        <button
          onClick={() => setShowQuickActions(!showQuickActions)}
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          {showQuickActions ? 'Hide' : 'Show'} Quick Actions
        </button>
      </div>

      {/* Quick Actions */}
      {showQuickActions && quickActions.length > 0 && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-3">Quick Actions:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left"
              >
                <span className="text-lg">{action.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{action.title}</p>
                  <p className="text-xs text-gray-500 truncate">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <BrainIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Welcome to Zephix AI Assistant
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              I'm your intelligent project management assistant! I can help you with:
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-left">
                <div className="flex items-center space-x-2 mb-2">
                  <ChartBarIcon className="h-4 w-4 text-indigo-500" />
                  <span className="font-medium">Project Analysis</span>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                  <span className="font-medium">Risk Assessment</span>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <UserGroupIcon className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Resource Optimization</span>
                </div>
              </div>
              <div className="text-left">
                <div className="flex items-center space-x-2 mb-2">
                  <LightBulbIcon className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">AI Insights</span>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <ClockIcon className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Health Monitoring</span>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <SparklesIcon className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">Smart Planning</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.isUser
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {renderMessageContent(message)}
                <p
                  className={`text-xs mt-1 ${
                    message.isUser ? 'text-indigo-200' : 'text-gray-500'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </p>
                
                {/* AI Insights and Actions */}
                {!message.isUser && message.suggestedActions && message.suggestedActions.length > 0 && (
                  renderSuggestedActions(message.suggestedActions)
                )}
                
                {!message.isUser && message.followUpQuestions && message.followUpQuestions.length > 0 && (
                  renderFollowUpQuestions(message.followUpQuestions)
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <div className="flex-1">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your projects, get insights, or request reports..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              rows={2}
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="self-end"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
