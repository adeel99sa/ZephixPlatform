export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
  },
  
  // Project endpoints
  PROJECTS: {
    LIST: '/projects',
    CREATE: '/projects',
    GET: (id: string) => `/projects/${id}`,
    UPDATE: (id: string) => `/projects/${id}`,
    DELETE: (id: string) => `/projects/${id}`,
    PHASES: (id: string) => `/projects/${id}/phases`,
    RESOURCES: (id: string) => `/projects/${id}/resources`,
    KPI: (id: string) => `/projects/${id}/kpi`,
  },
  
  // KPI endpoints
  KPI: {
    PORTFOLIO: '/kpi/portfolio',
    PROJECT: (id: string) => `/kpi/project/${id}`,
    RESOURCE: (id: string) => `/kpi/resource/${id}`,
    ORGANIZATION: '/kpi/organization',
  },
  
  // Resource endpoints
  RESOURCES: {
    LIST: '/resources',
    CREATE: '/resources',
    GET: (id: string) => `/resources/${id}`,
    UPDATE: (id: string) => `/resources/${id}`,
    DELETE: (id: string) => `/resources/${id}`,
    ALLOCATIONS: (id: string) => `/resources/${id}/allocations`,
    AVAILABILITY: (id: string) => `/resources/${id}/availability`,
  },
  
  // Organization endpoints
  ORGANIZATIONS: {
    LIST: '/organizations',
    CREATE: '/organizations',
    GET: (id: string) => `/organizations/${id}`,
    UPDATE: (id: string) => `/organizations/${id}`,
    DELETE: (id: string) => `/organizations/${id}`,
    MEMBERS: (id: string) => `/organizations/${id}/members`,
    SETTINGS: (id: string) => `/organizations/${id}/settings`,
  },
  
  // Health check
  HEALTH: '/health',
} as const;
