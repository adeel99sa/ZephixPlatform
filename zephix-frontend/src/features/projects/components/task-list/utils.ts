import type { WorkTaskStatus } from './types';

export function getStatusColor(status: WorkTaskStatus): string {
  switch (status) {
    case 'TODO':
    case 'BACKLOG':
      return 'bg-gray-100 text-gray-800';
    case 'IN_PROGRESS':
    case 'IN_REVIEW':
    case 'BLOCKED':
      return 'bg-blue-100 text-blue-800';
    case 'DONE':
    case 'CANCELED':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getStatusLabel(status: WorkTaskStatus): string {
  switch (status) {
    case 'BACKLOG': return 'Backlog';
    case 'TODO': return 'Todo';
    case 'IN_PROGRESS': return 'In Progress';
    case 'BLOCKED': return 'Blocked';
    case 'IN_REVIEW': return 'In Review';
    case 'DONE': return 'Done';
    case 'CANCELED': return 'Canceled';
    default: return status;
  }
}