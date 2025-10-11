import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { handleApiError, getFieldErrorFromConstraint } from '@/lib/handleApiError';
import { showToast } from '@/lib/toast';
import { ApiError } from '@/types/api';

/**
 * Options for useApiMutation hook
 */
interface ApiMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData) => void;
  successMessage?: string;
  setError?: (field: string, error: { message: string }) => void;
  onError?: (error: ApiError) => void;
}

/**
 * Custom hook that wraps react-query's useMutation with automatic error handling
 * 
 * @example
 * const createProject = useApiMutation(
 *   (data) => apiClient.post('/api/projects', data),
 *   {
 *     successMessage: 'Project created successfully!',
 *     setError: form.setError,
 *     onSuccess: () => router.push('/projects')
 *   }
 * );
 */
export function useApiMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: ApiMutationOptions<TData, TVariables>,
) {
  return useMutation<TData, ApiError, TVariables>({
    mutationFn,
    onSuccess: (data) => {
      if (options?.successMessage) {
        showToast.success(options.successMessage);
      }
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      // Show toast (handled by handleApiError)
      handleApiError(error);

      // Set inline form field error if applicable
      if (error.constraint && options?.setError) {
        const fieldError = getFieldErrorFromConstraint(error.constraint);
        if (fieldError) {
          options.setError(fieldError.field, { message: fieldError.message });
        }
      }

      // Call custom error handler if provided
      options?.onError?.(error);
    },
  } as UseMutationOptions<TData, ApiError, TVariables>);
}
