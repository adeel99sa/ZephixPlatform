import { apiPost } from '../services/api.service';

interface AuditEntry {
  userId: string;
  action?: string;
  permission?: string;
  timestamp: string;
  path: string;
  unauthorized?: boolean;
  details?: Record<string, any>;
}

export const logAdminAccess = async (entry: AuditEntry) => {
  try {
    // Send to backend for persistent storage
    await apiPost('/admin/audit', entry);
  } catch (error) {
    // Log to console as fallback
    console.error('Audit log failed:', error);
    console.log('Audit entry:', entry);
  }
};

export const logAdminAction = async (
  userId: string,
  action: string,
  details?: Record<string, any>
) => {
  return logAdminAccess({
    userId,
    action,
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
    details
  });
};
