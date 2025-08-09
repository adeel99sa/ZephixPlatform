import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ChatBubbleLeftIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  MinusIcon
} from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { cn } from '../../utils';
import { aiApi } from '../../services/api';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
}

interface ChatHeaderProps {
  currentPage: string;
  onClose: () => void;
  onMinimize: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ currentPage, onClose, onMinimize }) => (
  <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white rounded-t-lg">
    <div className="flex items-center space-x-2">
      <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
        <SparklesIcon className="w-4 h-4 text-white" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900">AI Assistant</h3>
        <p className="text-xs text-gray-500">Helping with {currentPage}</p>
      </div>
    </div>
    <div className="flex items-center space-x-1">
      <button
        onClick={onMinimize}
        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
        title="Minimize"
      >
        <MinusIcon className="w-4 h-4" />
      </button>
      <button
        onClick={onClose}
        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
        title="Close"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  </div>
);

interface ChatMessagesProps {
  messages: Message[];
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
      {messages.length === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <p className="text-gray-600 text-sm">
            Hi! I'm your AI assistant. How can I help you today?
          </p>
        </div>
      )}
      
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex",
            message.isUser ? "justify-end" : "justify-start"
          )}
        >
          <div
            className={cn(
              "max-w-[80%] rounded-lg px-3 py-2 text-sm",
              message.isUser
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-900 border border-gray-200"
            )}
          >
            {message.isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-gray-500">AI is thinking...</span>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
            <p className={cn(
              "text-xs mt-1",
              message.isUser ? "text-indigo-200" : "text-gray-500"
            )}>
              {message.timestamp.toLocaleTimeString()}
            </p>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4 bg-white border-t border-gray-200 rounded-b-lg">
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          <PaperAirplaneIcon className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export const FloatingAIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState('');
  const location = useLocation();

  // Get page context for AI
  useEffect(() => {
    const pageMap: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/projects': 'Projects',
      '/organizations/team': 'Team Management',
      '/organizations/settings': 'Organization Settings',
      '/brd/upload': 'BRD Upload',
      '/intelligence': 'Document Intelligence'
    };
    
    // Handle dynamic routes
    let pageName = pageMap[location.pathname];
    if (!pageName) {
      if (location.pathname.startsWith('/projects/')) {
        pageName = 'Project Details';
      } else {
        pageName = 'Application';
      }
    }
    
    setCurrentPage(pageName);
  }, [location]);

  const getPageContext = (pathname: string): string => {
    const contexts: Record<string, string> = {
      '/dashboard': 'This page shows the main dashboard with project overview and AI assistant. Users can get insights, create projects, and manage their work.',
      '/projects': 'This page shows project management and portfolio overview. Users can create, view, and manage projects, track progress, and collaborate with team members.',
      '/organizations/team': 'This page is for team management, inviting members, managing roles and permissions, and organizing team structure.',
      '/organizations/settings': 'This page contains organization settings including general configuration, billing, integrations, and administrative controls.',
      '/brd/upload': 'This page is for uploading Business Requirements Documents for AI analysis and processing.',
      '/intelligence': 'This page shows AI document analysis results, insights, and intelligent recommendations based on uploaded documents.'
    };
    
    if (pathname.startsWith('/projects/')) {
      return 'This page shows detailed information about a specific project including status, tasks, team members, and project analytics.';
    }
    
    return contexts[pathname] || 'General application assistance available. The user is navigating through the Zephix AI project management platform.';
  };

  const handleSendMessage = async (message: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      isUser: true,
      timestamp: new Date()
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: '',
      isUser: false,
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setIsLoading(true);

    try {
      // Include page context in AI prompt
      const contextualPrompt = `
        User is currently on the ${currentPage} page.
        Page context: ${getPageContext(location.pathname)}
        
        User question: ${message}
        
        Please provide helpful, contextual assistance for this specific page and situation. Be concise and actionable.
      `;

      const response = await aiApi.sendMessage(contextualPrompt);
      
      const aiMessage: Message = {
        id: response.messageId,
        content: response.response,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => prev.filter(msg => !msg.isLoading).concat(aiMessage));
    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => prev.filter(msg => !msg.isLoading).concat(errorMessage));
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  return (
    <>
      {/* Floating Chat Bubble */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 z-50 group"
          title="Open AI Assistant"
        >
          <ChatBubbleLeftIcon className="w-6 h-6" />
          {/* Online indicator */}
          <span className="absolute -top-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-white"></span>
          
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            AI Assistant - Ask me anything!
          </div>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className={cn(
          "fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl border z-50 transition-all duration-300",
          isMinimized 
            ? "w-80 h-16" 
            : "w-96 h-[500px]"
        )}>
          <ChatHeader 
            currentPage={currentPage} 
            onClose={handleClose}
            onMinimize={handleMinimize}
          />
          
          {!isMinimized && (
            <>
              <ChatMessages messages={messages} />
              <ChatInput 
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
              />
            </>
          )}
        </div>
      )}
    </>
  );
};
