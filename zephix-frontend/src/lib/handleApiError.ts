import { showToast } from './toast';
import { ApiError, FieldError } from '@/types/api';
import { isApiError } from './apiClient';

/**
 * Centralized API error handler
 * Shows toast notification and returns structured error
 */
export function handleApiError(error: unknown): ApiError | null {
  if (isApiError(error)) {
    // Show toast with the error message
    showToast.error(error.message);
    return error;
  }

  // Unknown error type
  showToast.error('An unexpected error occurred. Please try again.');
  return null;
}

/**
 * Maps database constraint names to form field names and messages
 * Used for showing inline validation errors
 */
export function getFieldErrorFromConstraint(
  constraint?: string,
): FieldError | null {
  if (!constraint) return null;

  const constraintMap: Record<string, FieldError> = {
    uq_projects_name_ws: {
      field: 'name',
      message: 'This project name is already used in this workspace',
    },
    uq_ws_name_org_guard: {
      field: 'name',
      message: 'This workspace name is already used in your organization',
    },
    uq_tasks_number_project: {
      field: 'taskNumber',
      message: 'This task number already exists in the project',
    },
    uq_ra_unique: {
      field: 'startDate',
      message: 'An allocation already exists for this person and week',
    },
    chk_ra_pct: {
      field: 'allocationPercentage',
      message: 'Allocation percentage must be between 0 and 150',
    },
    chk_ra_hours: {
      field: 'hoursPerWeek',
      message: 'Hours per week must be between 0 and 168',
    },
  };

  return constraintMap[constraint] || null;
}
