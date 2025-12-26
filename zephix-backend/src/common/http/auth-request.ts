import { Request } from 'express';

export type AuthUser = {
  id: string;
  email: string;
  role?: string;
  platformRole?: string;
  organizationId?: string;
  workspaceId?: string;
  roles?: string[];
};

export type AuthRequest = Request & {
  user?: AuthUser;
};
