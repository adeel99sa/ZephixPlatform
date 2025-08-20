import { AdminDashboardData, User, SecuritySettings } from '../types/admin';

export const mockDashboardData: AdminDashboardData = {
  systemHealth: {
    status: "healthy" as "healthy" | "degraded" | "error",
    services: {
      database: "operational",
      api: "operational",
      ai: "operational",
      storage: "operational"
    },
    lastChecked: new Date().toISOString()
  },
  userStats: {
    active: 24,
    total: 50,
    licensed: 50,
    growth: "+12% this week",
    newThisWeek: 3
  },
  governance: {
    projectsWithApprovalGates: 3,
    totalProjects: 15,
    pendingApprovals: 2,
    complianceScore: 87
  },
  usage: {
    users: generateMockUserActivity(7),
    storage: { used: 120, limit: 200, unit: "GB" },
    apiCalls: generateMockApiUsage(7),
    aiCredits: { used: 150, limit: 500, unit: "credits" }
  }
};

export const mockUsers: User[] = [
  {
    id: "user-1",
    name: "John Smith",
    email: "john@company.com", 
    role: "Admin" as "Admin" | "Member" | "Viewer",
    status: "Active" as "Active" | "Inactive" | "Pending",
    lastLogin: "2024-08-19T10:30:00Z",
    organizationId: "org-1",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: "user-2", 
    name: "Sarah Johnson",
    email: "sarah@company.com",
    role: "Member",
    status: "Active", 
    lastLogin: "2024-08-19T08:15:00Z",
    organizationId: "org-1",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b147?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: "user-3",
    name: "Michael Chen",
    email: "michael@company.com",
    role: "Member",
    status: "Active",
    lastLogin: "2024-08-18T16:45:00Z",
    organizationId: "org-1",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: "user-4",
    name: "Emily Rodriguez",
    email: "emily@company.com",
    role: "Viewer",
    status: "Active",
    lastLogin: "2024-08-17T14:20:00Z",
    organizationId: "org-1",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: "user-5",
    name: "David Kim",
    email: "david@company.com",
    role: "Member",
    status: "Inactive",
    lastLogin: "2024-08-10T09:30:00Z",
    organizationId: "org-1",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: "user-6",
    name: "Lisa Thompson",
    email: "lisa@company.com",
    role: "Admin",
    status: "Active",
    lastLogin: "2024-08-19T11:15:00Z",
    organizationId: "org-1",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: "user-7",
    name: "Robert Wilson",
    email: "robert@company.com",
    role: "Member",
    status: "Pending",
    lastLogin: null,
    organizationId: "org-1",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: "user-8",
    name: "Jennifer Lee",
    email: "jennifer@company.com",
    role: "Viewer",
    status: "Active",
    lastLogin: "2024-08-16T13:45:00Z",
    organizationId: "org-1",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b147?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: "user-9",
    name: "Thomas Brown",
    email: "thomas@company.com",
    role: "Member",
    status: "Active",
    lastLogin: "2024-08-19T07:30:00Z",
    organizationId: "org-1",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: "user-10",
    name: "Amanda Davis",
    email: "amanda@company.com",
    role: "Member",
    status: "Active",
    lastLogin: "2024-08-18T15:20:00Z",
    organizationId: "org-1",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face"
  }
];

export const mockSecuritySettings: SecuritySettings = {
  require2FA: true,
  enableSSO: false,
  ssoProvider: "google",
  sessionTimeout: 8, // hours
  passwordPolicy: "strong",
  auditLogging: true
};

export const mockTemplates = [
  {
    id: "template-1",
    name: "Software Development BRD",
    description: "Standard template for software development business requirements",
    category: "Software Development",
    lastModified: "2024-08-19T10:00:00Z",
    createdBy: "John Smith"
  },
  {
    id: "template-2",
    name: "Marketing Campaign BRD",
    description: "Template for marketing campaign business requirements",
    category: "Marketing",
    lastModified: "2024-08-18T14:30:00Z",
    createdBy: "Sarah Johnson"
  },
  {
    id: "template-3",
    name: "Product Launch BRD",
    description: "Comprehensive template for product launch requirements",
    category: "Product Management",
    lastModified: "2024-08-17T09:15:00Z",
    createdBy: "Michael Chen"
  }
];

export const mockAuditLogs = [
  {
    id: "audit-1",
    action: "User Login",
    userId: "user-1",
    timestamp: "2024-08-19T10:30:00Z",
    details: "Successful login from IP 192.168.1.100",
    ipAddress: "192.168.1.100"
  },
  {
    id: "audit-2",
    action: "Role Updated",
    userId: "user-3",
    timestamp: "2024-08-19T09:45:00Z",
    details: "Role changed from Viewer to Member by admin",
    ipAddress: "192.168.1.101"
  },
  {
    id: "audit-3",
    action: "Security Setting Changed",
    userId: "user-1",
    timestamp: "2024-08-19T08:20:00Z",
    details: "2FA requirement enabled",
    ipAddress: "192.168.1.100"
  }
];

function generateMockUserActivity(days: number) {
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    activeUsers: Math.floor(Math.random() * 20) + 15
  })).reverse();
}

function generateMockApiUsage(days: number) {
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    calls: Math.floor(Math.random() * 1000) + 500
  })).reverse();
}

