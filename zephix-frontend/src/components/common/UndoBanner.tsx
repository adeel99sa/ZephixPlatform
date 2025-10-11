import React, { useEffect, useState, useCallback } from 'react';
import { X, Undo2 } from 'lucide-react';

interface UndoBannerProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number; // milliseconds before auto-dismiss
  visible: boolean;
}

export const UndoBanner: React.FC<UndoBannerProps> = ({
  message,
  onUndo,
  onDismiss,
  duration = 10000, // 10 seconds default
  visible
}) => {
  const [isVisible, setIsVisible] = useState(visible);
  const [timeLeft, setTimeLeft] = useState(Math.ceil(duration / 1000));

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      setTimeLeft(Math.ceil(duration / 1000));
      
      if (duration > 0) {
        const timer = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              setIsVisible(false);
              onDismiss();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [visible, duration]); // Removed onDismiss from dependencies

  const handleUndo = useCallback(() => {
    setIsVisible(false);
    onUndo();
  }, [onUndo]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss();
  }, [onDismiss]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-gray-900 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-4 min-w-[400px]">
        {/* Icon */}
        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        
        {/* Message */}
        <span className="flex-1">{message}</span>
        
        {/* Countdown */}
        <span className="text-gray-400 text-sm font-mono">{timeLeft}s</span>
        
        {/* Undo Button */}
        <button 
          onClick={handleUndo}
          className="text-blue-400 font-medium uppercase tracking-wide hover:text-blue-300 transition-colors"
        >
          UNDO
        </button>
        
        {/* Dismiss Button */}
        <button 
          onClick={handleDismiss}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default UndoBanner;

