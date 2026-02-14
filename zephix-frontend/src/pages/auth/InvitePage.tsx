import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Phase 2A: /invite is a dead-end page. Redirect to the proper invite accept
 * flow at /invites/accept which handles tokens, or fall back to login.
 */
export const InvitePage: React.FC = () => {
  // The real invite acceptance flow is at /invites/accept (InviteAcceptPage).
  // This page was a placeholder. Redirect users to login.
  return <Navigate to="/login" replace />;
};
