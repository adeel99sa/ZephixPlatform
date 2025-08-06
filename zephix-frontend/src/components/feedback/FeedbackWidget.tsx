import React, { useState } from 'react';
import { ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { useFeedback } from '../../hooks/useFeedback';
import type { FeedbackData } from '../../types';
import { cn } from '../../utils';

const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature_request', 'usability', 'general']),
  content: z.string().min(10, 'Please provide at least 10 characters').max(2000),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface FeedbackWidgetProps {
  // Add props here if needed in the future
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { submitFeedback, getBrowserMetadata, isSubmitting } = useFeedback();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { type: 'general' },
  });

  const watchedContent = watch('content');
  const remainingChars = 2000 - (watchedContent?.length || 0);

  const onSubmit = async (data: FeedbackFormData) => {
    try {
      const feedbackData: FeedbackData = {
        ...data,
        context: window.location.pathname,
        metadata: getBrowserMetadata(),
      };

      await submitFeedback(feedbackData);
      reset();
      setIsOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const feedbackTypes = [
    { value: 'general', label: '💬 General Feedback', description: 'Overall thoughts or suggestions' },
    { value: 'feature_request', label: '✨ Feature Request', description: 'Suggest a new feature' },
    { value: 'usability', label: '🎯 Usability Issue', description: 'Something is confusing or hard to use' },
    { value: 'bug', label: '🐛 Bug Report', description: 'Something is broken' },
  ];

  return (
    <>
      {/* Feedback Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors"
        title="Send Feedback"
        aria-label="Open feedback form"
      >
        <ChatBubbleLeftRightIcon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 id="feedback-title" className="text-lg font-semibold text-gray-900">Send Feedback</h3>
                <p className="text-sm text-gray-600">Help us improve Zephix</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close feedback form"
              >
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4" aria-label="Feedback form">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What type of feedback do you have?
                </label>
                <div className="space-y-2">
                  {feedbackTypes.map((type) => (
                    <label key={type.value} className="flex items-start space-x-3 cursor-pointer">
                      <input
                        {...register('type')}
                        type="radio"
                        value={type.value}
                        className="mt-1 text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Feedback *
                </label>
                <textarea
                  {...register('content')}
                  rows={4}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 resize-none"
                  placeholder="What works well? What could be improved? What features are missing?"
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.content && (
                    <p className="text-sm text-red-600">{errors.content.message}</p>
                  )}
                  <span className={cn(
                    'text-xs ml-auto',
                    remainingChars < 100 ? 'text-orange-600' : 'text-gray-500'
                  )}>
                    {remainingChars} characters remaining
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-xs text-blue-800">
                  💡 Your feedback helps shape Zephix's future. We review every submission and will use your insights to prioritize features and improvements.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  Send Feedback
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}; 