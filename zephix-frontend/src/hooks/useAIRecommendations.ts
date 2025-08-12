import { useState, useCallback } from 'react';
import { AIRecommendation } from '../components/ai/AISuggestionInterface';

export interface RecommendationAction {
  type: 'accept' | 'modify' | 'alternative' | 'dismiss';
  recommendation: AIRecommendation;
  data?: any;
  timestamp: Date;
}

export const useAIRecommendations = () => {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [actions, setActions] = useState<RecommendationAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRecommendation = useCallback((recommendation: AIRecommendation) => {
    setRecommendations(prev => [...prev, recommendation]);
  }, []);

  const updateRecommendation = useCallback((id: string, updates: Partial<AIRecommendation>) => {
    setRecommendations(prev => 
      prev.map(rec => rec.id === id ? { ...rec, ...updates } : rec)
    );
  }, []);

  const removeRecommendation = useCallback((id: string) => {
    setRecommendations(prev => prev.filter(rec => rec.id !== id));
  }, []);

  const acceptRecommendation = useCallback((recommendation: AIRecommendation) => {
    // Mark as accepted
    updateRecommendation(recommendation.id, { 
      status: 'accepted' as any,
      acceptedAt: new Date()
    });

    // Record the action
    const action: RecommendationAction = {
      type: 'accept',
      recommendation,
      timestamp: new Date()
    };
    setActions(prev => [...prev, action]);

    // Remove from active recommendations
    removeRecommendation(recommendation.id);
  }, [updateRecommendation, removeRecommendation]);

  const modifyRecommendation = useCallback((recommendation: AIRecommendation, modifications: any) => {
    // Apply modifications
    updateRecommendation(recommendation.id, {
      description: modifications.description || recommendation.description,
      modifiedAt: new Date(),
      modifications: modifications
    });

    // Record the action
    const action: RecommendationAction = {
      type: 'modify',
      recommendation,
      data: modifications,
      timestamp: new Date()
    };
    setActions(prev => [...prev, action]);
  }, [updateRecommendation]);

  const suggestAlternative = useCallback((recommendation: AIRecommendation, alternative: string) => {
    // Add alternative to the recommendation
    updateRecommendation(recommendation.id, {
      alternatives: [...(recommendation.alternatives || []), alternative],
      alternativeAddedAt: new Date()
    });

    // Record the action
    const action: RecommendationAction = {
      type: 'alternative',
      recommendation,
      data: { alternative },
      timestamp: new Date()
    };
    setActions(prev => [...prev, action]);
  }, [updateRecommendation]);

  const dismissRecommendation = useCallback((recommendation: AIRecommendation, reason: string) => {
    // Mark as dismissed
    updateRecommendation(recommendation.id, {
      status: 'dismissed' as any,
      dismissedAt: new Date(),
      dismissReason: reason
    });

    // Record the action
    const action: RecommendationAction = {
      type: 'dismiss',
      recommendation,
      data: { reason },
      timestamp: new Date()
    };
    setActions(prev => [...prev, action]);

    // Remove from active recommendations
    removeRecommendation(recommendation.id);
  }, [updateRecommendation, removeRecommendation]);

  const clearActions = useCallback(() => {
    setActions([]);
  }, []);

  const getAcceptedRecommendations = useCallback(() => {
    return actions.filter(action => action.type === 'accept');
  }, [actions]);

  const getModifiedRecommendations = useCallback(() => {
    return actions.filter(action => action.type === 'modify');
  }, [actions]);

  const getDismissedRecommendations = useCallback(() => {
    return actions.filter(action => action.type === 'dismiss');
  }, [actions]);

  return {
    // State
    recommendations,
    actions,
    isLoading,
    error,
    
    // Actions
    addRecommendation,
    updateRecommendation,
    removeRecommendation,
    acceptRecommendation,
    modifyRecommendation,
    suggestAlternative,
    dismissRecommendation,
    clearActions,
    
    // Getters
    getAcceptedRecommendations,
    getModifiedRecommendations,
    getDismissedRecommendations,
    
    // Setters
    setIsLoading,
    setError
  };
};
