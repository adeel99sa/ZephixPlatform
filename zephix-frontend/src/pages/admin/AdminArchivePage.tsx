import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

/**
 * AdminArchivePage - Redirects to /admin/trash
 * Archive functionality has been consolidated into the Trash page
 */
export default function AdminArchivePage() {
  return <Navigate to="/admin/trash" replace />;
}
