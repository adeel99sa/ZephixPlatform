import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Building2, Users, Shield, CreditCard, FileText, 
  Brain, Link, Database, Scale, Bell, BarChart3,
  HeadphonesIcon, ChevronDown, Settings, LayoutDashboard, ArrowLeft
} from 'lucide-react';

const adminNavigation = [
  {
    id: 'organization',
    label: 'Organization',
    icon: Building2,
    children: [
      { path: '/admin/org', label: 'Overview' },
      { path: '/admin/users', label: 'Users & Teams' },
      { path: '/admin/roles', label: 'Roles & Permissions' },
      { path: '/admin/security', label: 'Security & SSO' },
      { path: '/admin/billing', label: 'Billing & Plans' },
      { path: '/admin/usage', label: 'Usage & Limits' }
    ]
  },
  {
    id: 'templates',
    label: 'Templates & Standards',
    icon: FileText,
    children: [
      { path: '/admin/templates/lifecycle', label: 'Lifecycle Templates' },
      { path: '/admin/templates/documents', label: 'Document Templates' },
      { path: '/admin/templates/work', label: 'Work & Task Templates' },
      { path: '/admin/templates/risk-library', label: 'Risk Library' },
      { path: '/admin/templates/formulas', label: 'Formula Library' },
      { path: '/admin/templates/raci', label: 'RACI Profiles' },
      { path: '/admin/templates/custom-fields', label: 'Custom Fields' },
      { path: '/admin/templates/blueprints', label: 'Project Blueprints' }
    ]
  },
  {
    id: 'ai',
    label: 'AI & Automation',
    icon: Brain,
    children: [
      { path: '/admin/ai/providers', label: 'AI Providers' },
      { path: '/admin/ai/prompts', label: 'Prompt Library' },
      { path: '/admin/ai/risk-sentinel', label: 'Risk Sentinel Settings' },
      { path: '/admin/ai/formula-assistant', label: 'Formula Assistant' },
      { path: '/admin/ai/guardrails', label: 'Guardrails & Redaction' },
      { path: '/admin/ai/automations', label: 'Automations' }
    ]
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Link,
    children: [
      { path: '/admin/integrations/email', label: 'Email / SMTP' },
      { path: '/admin/integrations/chat', label: 'Chat (Slack/Teams)' },
      { path: '/admin/integrations/dev-tools', label: 'Dev Tools' },
      { path: '/admin/integrations/calendar', label: 'Calendar' },
      { path: '/admin/integrations/storage', label: 'Storage' },
      { path: '/admin/integrations/webhooks', label: 'Webhooks' },
      { path: '/admin/integrations/api-keys', label: 'API Keys' }
    ]
  },
  {
    id: 'data',
    label: 'Data & Operations',
    icon: Database,
    children: [
      { path: '/admin/data/imports', label: 'Imports' },
      { path: '/admin/data/exports', label: 'Exports' },
      { path: '/admin/data/backups', label: 'Backups & Restore' },
      { path: '/admin/data/retention', label: 'Data Retention' },
      { path: '/admin/data/jobs', label: 'Background Jobs' },
      { path: '/admin/data/search', label: 'Search & Indexing' },
      { path: '/admin/data/feature-flags', label: 'Feature Flags' }
    ]
  },
  {
    id: 'governance',
    label: 'Governance & Compliance',
    icon: Scale,
    children: [
      { path: '/admin/governance/audit', label: 'Audit Logs' },
      { path: '/admin/governance/approvals', label: 'Approvals & Policies' },
      { path: '/admin/governance/access-reviews', label: 'Access Reviews' },
      { path: '/admin/governance/privacy', label: 'Legal & Privacy' }
    ]
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    children: [
      { path: '/admin/notifications/templates', label: 'Email Templates' },
      { path: '/admin/notifications/in-app', label: 'In-App Messages' },
      { path: '/admin/notifications/rules', label: 'Notification Rules' }
    ]
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    icon: BarChart3,
    children: [
      { path: '/admin/reports/portfolio', label: 'Portfolio KPIs' },
      { path: '/admin/reports/risk-heatmap', label: 'Risk Heatmaps' },
      { path: '/admin/reports/utilization', label: 'Utilization & Cost' }
    ]
  }
];

// MVP sections to enable first
const MVP_SECTIONS = [
  'organization',
  'templates',
  'ai',
  'integrations',
  'data',
  'governance',
  'notifications',
  'reports'
];

export function AdminLayout() {
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const renderNavigationItem = (item: any) => {
    const isExpanded = expandedSections.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className="mb-2">
        <button
          onClick={() => hasChildren ? toggleSection(item.id) : navigate(item.path)}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
            hasChildren 
              ? 'text-gray-700 hover:bg-gray-100' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </div>
          {hasChildren && (
            <ChevronDown 
              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            />
          )}
        </button>
        
        {hasChildren && isExpanded && (
          <div className="ml-6 mt-1 space-y-1">
            {item.children.map((child: any) => (
              <NavLink
                key={child.path}
                to={child.path}
                className={({ isActive }) =>
                  `block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Admin Console</h1>
            <button
              onClick={() => navigate('/')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">Manage your organization</p>
        </div>
        
        <nav className="p-4 space-y-1">
          {adminNavigation.map(renderNavigationItem)}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
