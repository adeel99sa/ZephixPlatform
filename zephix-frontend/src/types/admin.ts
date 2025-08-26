export interface AdminMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType;
  path: string;
  children?: AdminMenuItem[];
  requiredPermission?: string;
}

export interface AdminSection {
  organization: boolean;
  templates: boolean;
  ai: boolean;
  integrations: boolean;
  data: boolean;
  governance: boolean;
  notifications: boolean;
  reports: boolean;
  support: boolean;
}
