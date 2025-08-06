import React, { useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useProjectSelection } from '../../hooks/useProjectSelection';
import type { AIResponse } from '../../services/aiService';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  action?: AIResponse['action'];
}

interface ChatInterfaceProps {
  messages: Message[];
  inputValue: string;
  isProcessing: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  inputValue,
  isProcessing,
  onInputChange,
  onSendMessage,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { selectedProject } = useProjectSelection();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const handleSendClick = () => {
    if (inputValue.trim() && !isProcessing) {
      onSendMessage();
    }
  };

  return (
    <div className="glass h-[600px] flex flex-col border border-gray-700/50" role="region" aria-label="AI Chat Interface">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
            <p className="text-sm text-gray-400">
              {selectedProject 
                ? `Working on: ${selectedProject.name}` 
                : 'Ask me anything about your projects and workflow'
              }
            </p>
          </div>
          {selectedProject && (
            <div className="text-right">
              <div className="text-xs text-gray-400">Current Project</div>
              <div className="text-sm font-medium text-indigo-400">
                {selectedProject.category} • {selectedProject.status}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4" role="log" aria-live="polite">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                  : 'bg-gray-700 text-gray-200'
              }`}
              role={message.type === 'user' ? 'log' : 'status'}
              aria-label={`${message.type === 'user' ? 'You' : 'AI Assistant'} message`}
            >
              {message.isLoading ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm">Thinking...</span>
                </div>
              ) : (
                <>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-700/50">
        <div className="flex space-x-4">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedProject 
                ? `Ask about ${selectedProject.name}...` 
                : "Ask me anything about your projects..."
            }
            className="flex-1 px-4 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isProcessing}
            aria-label="Type your message"
            aria-describedby={isProcessing ? 'processing-status' : undefined}
          />
          <button
            onClick={handleSendClick}
            disabled={!inputValue.trim() || isProcessing}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
            aria-label="Send message"
            aria-busy={isProcessing}
          >
            {isProcessing ? (
              <LoadingSpinner size="sm" />
            ) : (
              <PaperAirplaneIcon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
        {isProcessing && (
          <p id="processing-status" className="text-xs text-gray-400 mt-2" role="status">
            Processing your message...
          </p>
        )}
      </div>
    </div>
  );
};
