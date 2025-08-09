export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'trial';
  description?: string;
  website?: string;
  industry?: string;
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  trialEndsAt?: string;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface UserOrganization {
  id: string;
  userId: string;
  organizationId: string;
  role: 'owner' | 'admin' | 'pm' | 'viewer';
  isActive: boolean;
  permissions: Record<string, any>;
  joinedAt?: string;
  lastAccessAt?: string;
  createdAt: string;
  updatedAt: string;
  organization: Organization;
}

export interface CreateOrganizationData {
  name: string;
  slug?: string;
  description?: string;
  website?: string;
  industry?: string;
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  settings?: Record<string, any>;
}

export interface InviteUserData {
  email: string;
  role: 'admin' | 'pm' | 'viewer';
  firstName?: string;
  lastName?: string;
  message?: string;
}

export interface OrganizationSignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  organizationName: string;
  organizationSlug?: string;
  website?: string;
  industry?: string;
  organizationSize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
}
