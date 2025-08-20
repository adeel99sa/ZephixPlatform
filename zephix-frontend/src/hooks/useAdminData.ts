import { useState, useEffect } from 'react';
import { mockDashboardData, mockUsers, mockSecuritySettings, mockTemplates, mockAuditLogs } from '../mocks/adminData';
import type { AdminDashboardData, User, SecuritySettings, Template, AuditLog, InviteUserRequest, UserRole } from '../types/admin';

export const useAdminDashboard = () => {
  const [data, setData] = useState<AdminDashboardData>(mockDashboardData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call
    const fetchData = async () => {
      try {
        setLoading(true);
        // TODO: Replace with real API call when backend is ready
        // const response = await apiClient.getDashboard();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
        setData(mockDashboardData);
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error, refetch: () => {} };
};

export const useAdminUsers = () => {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteUser = async (userData: { email: string; role: string }) => {
    setLoading(true);
    try {
      // TODO: Replace with real API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newUser: User = {
        id: `user-${Date.now()}`,
        name: userData.email.split('@')[0],
        email: userData.email,
        role: userData.role as UserRole,
        status: 'Pending',
        lastLogin: null,
        organizationId: 'org-1',
        avatar: `https://ui-avatars.com/api/?name=${userData.email}&background=random`
      };
      
      setUsers(prev => [...prev, newUser]);
    } catch (err) {
      setError('Failed to invite user');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    setLoading(true);
    try {
      // TODO: Replace with real API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: role as UserRole } : user
      ));
    } catch (err) {
      setError('Failed to update user role');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    setLoading(true);
    try {
      // TODO: Replace with real API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUsers(prev => prev.filter(user => user.id !== userId));
    } catch (err) {
      setError('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  return { users, loading, error, inviteUser, updateUserRole, deleteUser };
};

export const useAdminSecurity = () => {
  const [settings, setSettings] = useState<SecuritySettings>(mockSecuritySettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSettings = async (newSettings: Partial<SecuritySettings>) => {
    setLoading(true);
    try {
      // TODO: Replace with real API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSettings(prev => ({ ...prev, ...newSettings }));
    } catch (err) {
      setError('Failed to update security settings');
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading, error, updateSettings };
};

export const useAdminTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTemplate = async (data: { name: string; description: string; category: string }) => {
    setLoading(true);
    try {
      // TODO: Replace with real API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newTemplate: Template = {
        id: `template-${Date.now()}`,
        name: data.name,
        description: data.description,
        category: data.category,
        lastModified: new Date().toISOString(),
        createdBy: 'Demo Admin'
      };
      
      setTemplates(prev => [...prev, newTemplate]);
    } catch (err) {
      setError('Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  return { templates, loading, error, createTemplate };
};

export const useAdminAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>(mockAuditLogs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async (filters?: any) => {
    setLoading(true);
    try {
      // TODO: Replace with real API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulate filtering
      let filteredLogs = mockAuditLogs;
      if (filters?.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
      }
      
      setLogs(filteredLogs);
    } catch (err) {
      setError('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  return { logs, loading, error, fetchLogs };
};

export const useAdminOverview = () => {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        // TODO: Replace with real API call
        // const response = await apiClient.get('/admin/overview');
        
        // Mock data for development
        const mockData: AdminOverview = {
          uptimePct: 99.98,
          lastUpdated: new Date().toISOString(),
          systemStatus: 'healthy',
          users: { 
            active: 148, 
            licensed: 120, 
            viewers: 28,
            growthRate: 12.5,
            lastSync: new Date(Date.now() - 300000).toISOString()
          },
          security: { 
            sso: true, 
            mfaRequired: true, 
            activeSessions: 412,
            failedLoginAttempts: 23,
            lastSecurityScan: new Date(Date.now() - 86400000).toISOString(),
            vulnerabilities: {
              critical: 0,
              high: 2,
              medium: 8,
              low: 15
            }
          },
          governance: { 
            pending: 6, 
            breaches: 1,
            avgApprovalTime: 18.5,
            complianceScore: 94.2,
            lastAudit: new Date(Date.now() - 604800000).toISOString()
          },
          usage: { 
            aiUsed: 1300, 
            aiTotal: 2000, 
            api24h: 58230,
            storageUsed: 847.5,
            storageTotal: 1000,
            bandwidth24h: 156.8
          }
        };
        
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
        setData(mockData);
      } catch (err) {
        setError('Failed to load overview data');
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  return { data, loading, error, refetch: fetchOverview };
};

export const useSecurityPolicies = () => {
  const [policies, setPolicies] = useState<SecurityPolicies | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      // TODO: Replace with real API call
      const mockPolicies: SecurityPolicies = {
        id: 'sec-policy-001',
        version: '2.1.0',
        lastModified: new Date(Date.now() - 86400000).toISOString(),
        modifiedBy: 'admin@zephix.com',
        mfaRequired: true,
        passwordMinLength: 12,
        passwordComplexity: {
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          preventCommonPasswords: true
        },
        sessionTimeoutMin: 60,
        maxConcurrentSessions: 3,
        ipAllowlist: ["10.0.0.0/8", "192.168.1.0/24"],
        ipBlocklist: ["203.0.113.0/24"],
        sso: { 
          enabled: true, 
          provider: "okta",
          config: { domain: 'zephix.okta.com', appId: 'zephix-admin' },
          lastSync: new Date(Date.now() - 3600000).toISOString(),
          userCount: 89
        },
        auditLogging: {
          enabled: true,
          retentionDays: 365,
          logLevel: 'detailed'
        },
        auditTrail: [
          {
            id: 'audit-001',
            action: 'policy_updated',
            user: 'admin@zephix.com',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            details: 'Updated MFA requirement and password complexity rules',
            ipAddress: '10.0.1.100',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
          }
        ]
      };
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setPolicies(mockPolicies);
    } catch (err) {
      setError('Failed to load security policies');
    } finally {
      setLoading(false);
    }
  };

  const updatePolicies = async (updates: Partial<SecurityPolicies>) => {
    try {
      setLoading(true);
      // TODO: Replace with real API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPolicies(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      setError('Failed to update security policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  return { policies, loading, error, updatePolicies, refetch: fetchPolicies };
};

export const useGovernanceApprovals = () => {
  const [approvals, setApprovals] = useState<GovernanceApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovals = async (status?: string) => {
    try {
      setLoading(true);
      // TODO: Replace with real API call
      const mockApprovals: GovernanceApproval[] = [
        {
          id: "apr-2025-0001",
          title: "Infrastructure Migration Budget Increase",
          type: "budget_change",
          projectId: "proj-infra-migration-2025",
          projectName: "Legacy System Cloud Migration",
          gate: "Budget Approval",
          due: "2025-08-25T17:00:00Z",
          slaHours: 48,
          urgency: "high",
          amount: 75000,
          currency: "USD",
          requestor: {
            id: "usr-sarah-001",
            name: "Sarah Johnson",
            email: "sarah.johnson@zephix.com",
            department: "Infrastructure",
            role: "Program Manager"
          },
          owner: "usr-mike-002",
          approvers: [
            {
              role: "department_head",
              name: "Mike Chen",
              email: "mike.chen@zephix.com",
              status: "approved",
              assignedAt: "2025-08-15T09:30:00Z",
              slaDeadline: "2025-08-17T17:00:00Z",
              approvedAt: "2025-08-16T14:20:00Z",
              comment: "Architecture review confirms necessity. Approved with recommendation for vendor diversification."
            },
            {
              role: "finance_director",
              name: "Lisa Wang",
              email: "lisa.wang@zephix.com",
              status: "pending",
              assignedAt: "2025-08-15T09:30:00Z",
              slaDeadline: "2025-08-20T17:00:00Z"
            },
            {
              role: "cto",
              name: "David Kumar",
              email: "david.kumar@zephix.com",
              status: "pending",
              assignedAt: "2025-08-15T09:30:00Z",
              slaDeadline: "2025-08-22T17:00:00Z"
            }
          ],
          status: "pending",
          justification: "Additional cloud migration costs for legacy system compatibility requirements discovered during architecture review. Vendor quotes indicate 15% cost increase due to specialized integration requirements.",
          attachments: [
            { id: "att-001", name: "migration-cost-analysis.pdf", size: "2.4 MB", type: "application/pdf", uploadedAt: "2025-08-15T09:28:00Z", uploadedBy: "sarah.johnson@zephix.com" },
            { id: "att-002", name: "vendor-quotes.xlsx", size: "856 KB", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", uploadedAt: "2025-08-15T09:29:00Z", uploadedBy: "sarah.johnson@zephix.com" }
          ],
          riskAssessment: {
            level: "medium",
            factors: ["Budget variance >20%", "Timeline impact", "Vendor dependency"],
            mitigations: ["Phased rollout plan", "Alternative vendor identified", "Contingency buffer allocated"],
            impact: "Project delay of 2-3 weeks if not approved",
            probability: "Medium - 60% chance of approval"
          },
          auditTrail: [
            { id: "audit-001", action: "submitted", user: "sarah.johnson@zephix.com", timestamp: "2025-08-15T09:30:00Z", details: "Budget increase request submitted" },
            { id: "audit-002", action: "auto_assigned", user: "system", timestamp: "2025-08-15T09:30:15Z", details: "Assigned to approval workflow: budget-change-high" },
            { id: "audit-003", action: "approved", user: "mike.chen@zephix.com", timestamp: "2025-08-16T14:20:00Z", comment: "Architecture review confirms necessity. Approved with recommendation for vendor diversification." }
          ],
          createdAt: "2025-08-15T09:30:00Z",
          updatedAt: "2025-08-16T14:20:00Z"
        },
        {
          id: "apr-2025-0002",
          title: "Security Architecture Review - New API Gateway",
          type: "security_review",
          projectId: "proj-api-gateway-2025",
          projectName: "Microservices API Gateway Implementation",
          gate: "Security Architecture Review",
          due: "2025-08-22T17:00:00Z",
          slaHours: 24,
          urgency: "medium",
          requestor: {
            id: "usr-alex-003",
            name: "Alex Rodriguez",
            email: "alex.rodriguez@zephix.com",
            department: "Engineering",
            role: "Senior Software Architect"
          },
          owner: "usr-emma-004",
          approvers: [
            {
              role: "security_architect",
              name: "Emma Thompson",
              email: "emma.thompson@zephix.com",
              status: "pending",
              assignedAt: "2025-08-18T10:00:00Z",
              slaDeadline: "2025-08-22T17:00:00Z"
            },
            {
              role: "infrastructure_lead",
              name: "James Wilson",
              email: "james.wilson@zephix.com",
              status: "pending",
              assignedAt: "2025-08-18T10:00:00Z",
              slaDeadline: "2025-08-22T17:00:00Z"
            }
          ],
          status: "pending",
          justification: "New API Gateway implementation requires security architecture review to ensure compliance with SOC 2 Type II requirements and internal security standards.",
          attachments: [
            { id: "att-003", name: "api-gateway-architecture.pdf", size: "3.2 MB", type: "application/pdf", uploadedAt: "2025-08-18T09:45:00Z", uploadedBy: "alex.rodriguez@zephix.com" },
            { id: "att-004", name: "security-requirements.docx", size: "1.1 MB", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", uploadedAt: "2025-08-18T09:46:00Z", uploadedBy: "alex.rodriguez@zephix.com" }
          ],
          riskAssessment: {
            level: "low",
            factors: ["New technology implementation", "Security compliance requirements"],
            mitigations: ["Phased rollout", "Comprehensive testing", "Security team involvement"],
            impact: "Minimal - standard security review process",
            probability: "High - 90% chance of approval"
          },
          auditTrail: [
            { id: "audit-004", action: "submitted", user: "alex.rodriguez@zephix.com", timestamp: "2025-08-18T10:00:00Z", details: "Security review request submitted" },
            { id: "audit-005", action: "auto_assigned", user: "system", timestamp: "2025-08-18T10:00:15Z", details: "Assigned to approval workflow: security-review-standard" }
          ],
          createdAt: "2025-08-18T10:00:00Z",
          updatedAt: "2025-08-18T10:00:00Z"
        }
      ];
      
      await new Promise(resolve => setTimeout(resolve, 600));
      setApprovals(mockApprovals);
    } catch (err) {
      setError('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const makeDecision = async (approvalId: string, decision: 'approve' | 'reject', comment: string) => {
    try {
      setLoading(true);
      // TODO: Replace with real API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setApprovals(prev => prev.map(approval => 
        approval.id === approvalId 
          ? { ...approval, status: decision === 'approve' ? 'approved' : 'rejected' }
          : approval
      ));
    } catch (err) {
      setError('Failed to make approval decision');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  return { approvals, loading, error, makeDecision, refetch: fetchApprovals };
};
