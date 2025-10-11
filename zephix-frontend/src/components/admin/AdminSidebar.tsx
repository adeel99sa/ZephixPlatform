import React, { useState } from 'react';
import {
  HomeIcon,
  UsersIcon,
  BuildingLibraryIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

interface AdminSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: { id: string; label: string }[];
}

const ADMIN_SECTIONS: AdminSection[] = [
  { 
    id: 'home', 
    label: 'Home', 
    icon: HomeIcon 
  },
  { 
    id: 'people', 
    label: 'People & Teams', 
    icon: UsersIcon,
    subItems: [
      { id: 'users', label: 'User Management' },
      { id: 'teams', label: 'Teams' },
      { id: 'invitations', label: 'Invitations' }
    ]
  },
  {
    id: 'governance',
    label: 'Governance',
    icon: BuildingLibraryIcon,
    subItems: [
      { id: 'resource-policies', label: 'Resource Policies' },
      { id: 'risk-rules', label: 'Risk Rules' },
      { id: 'templates', label: 'Project Templates' },
      { id: 'workflows', label: 'Approval Workflows' }
    ]
  },
  {
    id: 'workspace',
    label: 'Workspace',
    icon: BuildingOfficeIcon,
    subItems: [
      { id: 'general', label: 'General Settings' },
      { id: 'security', label: 'Security' },
      { id: 'integrations', label: 'Integrations' },
      { id: 'audit', label: 'Audit Logs' }
    ]
  },
  { 
    id: 'billing', 
    label: 'Billing', 
    icon: CreditCardIcon 
  }
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ 
  activeSection, 
  onSectionChange 
}) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['people', 'governance', 'workspace']);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const isSectionActive = (section: AdminSection) => {
    if (section.id === activeSection) return true;
    if (section.subItems) {
      return section.subItems.some(subItem => subItem.id === activeSection);
    }
    return false;
  };

  const isSubItemActive = (subItemId: string) => {
    return activeSection === subItemId;
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">Admin Hub</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your organization</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {ADMIN_SECTIONS.map((section) => (
          <div key={section.id}>
            {section.subItems ? (
              <div>
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isSectionActive(section)
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    <section.icon className="w-5 h-5 mr-3" />
                    {section.label}
                  </div>
                  {expandedSections.includes(section.id) ? (
                    <ChevronDownIcon className="w-4 h-4" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4" />
                  )}
                </button>
                
                {expandedSections.includes(section.id) && (
                  <div className="ml-8 mt-1 space-y-1">
                    {section.subItems.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => onSectionChange(subItem.id)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          isSubItemActive(subItem.id)
                            ? 'bg-blue-50 text-blue-900 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onSectionChange(section.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isSectionActive(section)
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <section.icon className="w-5 h-5 mr-3" />
                {section.label}
              </button>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p>Zephix Admin Hub</p>
          <p>Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
};













