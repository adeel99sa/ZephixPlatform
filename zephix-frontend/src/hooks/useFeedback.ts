import { useState } from 'react';
import { toast } from 'sonner';
import { feedbackApi } from '../services/api';
import type { FeedbackData } from '../types';

export const useFeedback = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeedback = async (data: FeedbackData) => {
    try {
      setIsSubmitting(true);
      const response = await feedbackApi.submit(data);
      toast.success('Thank you for your feedback! 🎉');
      return response;
    } catch (error) {
      toast.error('Failed to submit feedback. Please try again.');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBrowserMetadata = () => {
    return {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };
  };

  return {
    submitFeedback,
    getBrowserMetadata,
    isSubmitting,
  };
}; 