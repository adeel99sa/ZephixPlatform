export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    REGISTER: '/api/auth/register',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    VERIFY_EMAIL: '/api/auth/verify-email',
  },
  
  // Project endpoints
  PROJECTS: {
    LIST: '/api/projects',
    CREATE: '/api/projects',
    GET: (id: string) => `/api/projects/${id}`,
    UPDATE: (id: string) => `/api/projects/${id}`,
    DELETE: (id: string) => `/api/projects/${id}`,
    PHASES: (id: string) => `/api/projects/${id}/phases`,
    RESOURCES: (id: string) => `/api/projects/${id}/resources`,
    KPI: (id: string) => `/api/projects/${id}/kpi`,
  },
  
  // KPI endpoints
  KPI: {
    PORTFOLIO: '/api/kpi/portfolio',
    PROJECT: (id: string) => `/api/kpi/project/${id}`,
    RESOURCE: (id: string) => `/api/kpi/resource/${id}`,
    ORGANIZATION: '/api/kpi/organization',
  },
  
  // Resource endpoints
  RESOURCES: {
    LIST: '/api/resources',
    CREATE: '/api/resources',
    GET: (id: string) => `/api/resources/${id}`,
    UPDATE: (id: string) => `/api/resources/${id}`,
    DELETE: (id: string) => `/api/resources/${id}`,
    ALLOCATIONS: (id: string) => `/api/resources/${id}/allocations`,
    AVAILABILITY: (id: string) => `/api/resources/${id}/availability`,
  },
  
  // Organization endpoints
  ORGANIZATIONS: {
    LIST: '/api/organizations',
    CREATE: '/api/organizations',
    GET: (id: string) => `/api/organizations/${id}`,
    UPDATE: (id: string) => `/api/organizations/${id}`,
    DELETE: (id: string) => `/api/organizations/${id}`,
    MEMBERS: (id: string) => `/api/organizations/${id}/members`,
    SETTINGS: (id: string) => `/api/organizations/${id}/settings`,
  },
  
  // Health check
  HEALTH: '/api/health',
} as const;
