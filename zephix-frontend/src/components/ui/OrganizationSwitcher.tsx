import React, { useState, useEffect } from 'react';
import {
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
  BuildingOfficeIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

import { useOrganizationStore } from '../../stores/organizationStore';
import { cn } from '../../utils';
import type { Organization } from '../../types/organization';

interface OrganizationSwitcherProps {
  className?: string;
  onCreateOrganization?: () => void;
  onOrganizationSettings?: () => void;
}

export const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({
  className,
  onCreateOrganization,
  onOrganizationSettings,
}) => {
  const {
    organizations,
    currentOrganization,
    isLoading,
    getUserOrganizations,
    switchOrganization,
  } = useOrganizationStore();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load organizations on mount if not already loaded
    if (organizations.length === 0) {
      getUserOrganizations();
    }
  }, [organizations.length]); // Removed getUserOrganizations from dependencies

  const handleSwitchOrganization = async (organization: Organization) => {
    if (organization.id === currentOrganization?.id) {
      setIsOpen(false);
      return;
    }

    await switchOrganization(organization.id);
    setIsOpen(false);
  };

  const handleCreateOrganization = () => {
    setIsOpen(false);
    onCreateOrganization?.();
  };

  const handleOrganizationSettings = () => {
    setIsOpen(false);
    onOrganizationSettings?.();
  };

  const getStatusBadge = (status: Organization['status']) => {
    const badges = {
      active: (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          Active
        </span>
      ),
      trial: (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          Trial
        </span>
      ),
      suspended: (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          Suspended
        </span>
      ),
    };
    return badges[status];
  };

  if (isLoading && organizations.length === 0) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="flex items-center space-x-2 p-3 rounded-lg bg-gray-700/50">
          <div className="w-8 h-8 bg-gray-600 rounded"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-600 rounded w-24 mb-1"></div>
            <div className="h-3 bg-gray-600 rounded w-16"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-3 text-left rounded-lg bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/50 transition-all duration-200"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select organization"
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <BuildingOfficeIcon className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {currentOrganization?.name || 'Select Organization'}
            </p>
            <div className="flex items-center space-x-2 mt-0.5">
              {currentOrganization && getStatusBadge(currentOrganization.status)}
              {currentOrganization?.trialEndsAt && currentOrganization.status === 'trial' && (
                <span className="text-xs text-gray-400">
                  Trial ends {new Date(currentOrganization.trialEndsAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronDownIcon
          className={cn(
            "w-4 h-4 text-gray-400 transition-transform duration-200",
            isOpen && "transform rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
            <div className="py-1" role="listbox">
              {/* Organizations list */}
              {organizations.map((organization) => (
                <button
                  key={organization.id}
                  onClick={() => handleSwitchOrganization(organization)}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-700/50 transition-colors duration-200"
                  role="option"
                  aria-selected={organization.id === currentOrganization?.id}
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <BuildingOfficeIcon className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {organization.name}
                    </p>
                    <div className="flex items-center space-x-2 mt-0.5">
                      {getStatusBadge(organization.status)}
                      {organization.industry && (
                        <span className="text-xs text-gray-400">
                          {organization.industry}
                        </span>
                      )}
                    </div>
                  </div>
                  {organization.id === currentOrganization?.id && (
                    <CheckIcon className="w-4 h-4 text-green-400" />
                  )}
                </button>
              ))}

              {/* Divider */}
              <div className="border-t border-gray-700 my-1" />

              {/* Actions */}
              <button
                onClick={handleCreateOrganization}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-700/50 transition-colors duration-200"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
                    <PlusIcon className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Create Organization
                  </p>
                  <p className="text-xs text-gray-400">
                    Start a new workspace
                  </p>
                </div>
              </button>

              {currentOrganization && (
                <button
                  onClick={handleOrganizationSettings}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-700/50 transition-colors duration-200"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
                      <CogIcon className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Organization Settings
                    </p>
                    <p className="text-xs text-gray-400">
                      Manage {currentOrganization.name}
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
