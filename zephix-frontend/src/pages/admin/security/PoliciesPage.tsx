import React, { useState } from 'react';
import { useSecurityPolicies } from '../../../hooks/useAdminData';
import { useRoleEnforcement } from '../../../hooks/useRoleEnforcement';
import { Card } from '../../../components/admin/shared/Card';
import { ToggleRow } from '../../../components/admin/security/ToggleRow';
import { Button } from '../../../components/admin/shared/Button';
import { toast } from '../../../components/admin/shared/Toast';
import { Permission } from '../../../utils/rolePolicy';

interface SecurityPoliciesState {
  policies: SecurityPolicies | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  lastSaved: string | null;
  hasUnsavedChanges: boolean;
  validationErrors: Record<string, string[]>;
}

export const PoliciesPage: React.FC = () => {
  const { policies, loading, error, updatePolicies } = useSecurityPolicies();
  const { hasPermission } = useRoleEnforcement();
  const [state, setState] = useState<SecurityPoliciesState>({
    policies: null,
    loading: false,
    error: null,
    saving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    validationErrors: {}
  });
  const [pendingChanges, setPendingChanges] = useState<Partial<SecurityPolicies>>({});
  const [showPreview, setShowPreview] = useState(false);

  const canWrite = hasPermission(Permission.WRITE_SECURITY);

  // Handle unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.hasUnsavedChanges]);

  const validatePolicyChange = (key: keyof SecurityPolicies, value: unknown): string[] => {
    const errors: string[] = [];
    
    switch (key) {
      case 'passwordMinLength':
        if (typeof value === 'number' && (value < 8 || value > 128)) {
          errors.push('Password length must be between 8 and 128 characters');
        }
        break;
      case 'sessionTimeoutMin':
        if (typeof value === 'number' && (value < 15 || value > 1440)) {
          errors.push('Session timeout must be between 15 minutes and 24 hours');
        }
        break;
      case 'maxConcurrentSessions':
        if (typeof value === 'number' && (value < 1 || value > 10)) {
          errors.push('Maximum concurrent sessions must be between 1 and 10');
        }
        break;
    }
    
    return errors;
  };

  const handlePolicyChange = (key: keyof SecurityPolicies, value: unknown) => {
    if (!canWrite) return;
    
    // Validate the change
    const validationErrors = validatePolicyChange(key, value);
    if (validationErrors.length > 0) {
      setState(prev => ({
        ...prev,
        validationErrors: { ...prev.validationErrors, [key]: validationErrors }
      }));
      toast.error(`Validation failed: ${validationErrors.join(', ')}`);
      return;
    }
    
    // Clear validation errors for this field
    setState(prev => ({
      ...prev,
      validationErrors: { ...prev.validationErrors, [key]: [] }
    }));
    
    setPendingChanges(prev => ({ ...prev, [key]: value }));
    setShowPreview(true);
    setState(prev => ({ ...prev, hasUnsavedChanges: true }));
  };

  const applyChanges = async () => {
    if (!canWrite || !policies) return;
    
    try {
      setState(prev => ({ ...prev, saving: true, error: null }));
      
      // Validate all pending changes
      const allValidationErrors: Record<string, string[]> = {};
      let hasErrors = false;
      
      Object.entries(pendingChanges).forEach(([key, value]) => {
        const errors = validatePolicyChange(key as keyof SecurityPolicies, value);
        if (errors.length > 0) {
          allValidationErrors[key] = errors;
          hasErrors = true;
        }
      });
      
      if (hasErrors) {
        setState(prev => ({ ...prev, validationErrors: allValidationErrors, saving: false }));
        toast.error('Please fix validation errors before applying changes');
        return;
      }
      
      // Simulate API call with realistic delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await updatePolicies(pendingChanges);
      
      setPendingChanges({});
      setShowPreview(false);
      setState(prev => ({ 
        ...prev, 
        saving: false, 
        lastSaved: new Date().toISOString(),
        hasUnsavedChanges: false 
      }));
      
      toast.success('Security policies updated successfully');
      
      // Log audit event (in real implementation)
      console.log('Security policy updated:', {
        userId: 'admin@zephix.com',
        changes: pendingChanges,
        timestamp: new Date().toISOString()
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update security policies';
      setState(prev => ({ 
        ...prev, 
        saving: false, 
        error: errorMessage 
      }));
      toast.error(errorMessage);
      console.error('Security policy update error:', err);
    }
  };

  const discardChanges = () => {
    setPendingChanges({});
    setShowPreview(false);
  };

  if (loading) return <PoliciesSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!policies) return null;

  const currentPolicies = { ...policies, ...pendingChanges };

  return (
    <div className="flex">
      {/* Main Content */}
      <div className="flex-1 mr-8">
        <h1 className="text-xl font-medium text-gray-900 mb-8">Security Policies</h1>
        
        <div className="space-y-6">
          {/* Authentication Section */}
          <Card>
            <h2 className="text-base font-medium text-gray-900 mb-4">Authentication</h2>
            
            <div className="space-y-4">
              <ToggleRow
                label="Require Multi-Factor Authentication"
                description="All users must enable 2FA to access the platform"
                checked={currentPolicies.mfaRequired}
                onChange={(checked) => handlePolicyChange('mfaRequired', checked)}
                disabled={!canWrite}
              />
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Minimum Password Length</label>
                  <p className="text-xs text-gray-500">Characters required for new passwords</p>
                </div>
                <input
                  type="number"
                  min="8"
                  max="128"
                  value={currentPolicies.passwordMinLength}
                  onChange={(e) => handlePolicyChange('passwordMinLength', parseInt(e.target.value))}
                  disabled={!canWrite}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          </Card>

          {/* Session Management */}
          <Card>
            <h2 className="text-base font-medium text-gray-900 mb-4">Session Management</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Session Timeout</label>
                  <p className="text-xs text-gray-500">Minutes of inactivity before automatic logout</p>
                </div>
                <select
                  value={currentPolicies.sessionTimeoutMin}
                  onChange={(e) => handlePolicyChange('sessionTimeoutMin', parseInt(e.target.value))}
                  disabled={!canWrite}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 focus:ring-primary focus:border-primary"
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={480}>8 hours</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Single Sign-On */}
          <Card>
            <h2 className="text-base font-medium text-gray-900 mb-4">Single Sign-On</h2>
            
            <div className="space-y-4">
              <ToggleRow
                label="Enable SSO Integration"
                description="Allow users to authenticate via SSO provider"
                checked={currentPolicies.sso.enabled}
                onChange={(checked) => handlePolicyChange('sso', { ...currentPolicies.sso, enabled: checked })}
                disabled={!canWrite}
              />
              
              {currentPolicies.sso.enabled && (
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">SSO Provider</label>
                    <p className="text-xs text-gray-500">Identity provider for SSO authentication</p>
                  </div>
                  <select
                    value={currentPolicies.sso.provider}
                    onChange={(e) => handlePolicyChange('sso', { ...currentPolicies.sso, provider: e.target.value })}
                    disabled={!canWrite}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 focus:ring-primary focus:border-primary"
                  >
                    <option value="okta">Okta</option>
                    <option value="azure">Azure AD</option>
                    <option value="google">Google Workspace</option>
                  </select>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Context Panel */}
      {canWrite && (
        <div className="w-90 bg-white border-l border-gray-200 p-6">
          <h3 className="text-base font-medium text-gray-900 mb-4">Policy Changes</h3>
          
          {showPreview ? (
            <div>
              <div className="space-y-3 mb-6">
                {Object.entries(pendingChanges).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="font-medium text-gray-900">{key}:</span>
                    <span className="ml-2 text-gray-600">{JSON.stringify(value)}</span>
                  </div>
                ))}
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={applyChanges}
                  className="w-full"
                >
                  Apply Changes
                </Button>
                <Button 
                  onClick={discardChanges}
                  variant="outline"
                  className="w-full"
                >
                  Discard Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              <p>Make changes to security policies using the controls on the left.</p>
              <p className="mt-2">Changes will be previewed here before applying.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PoliciesSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
    {Array.from({ length: 3 }).map((_, index) => (
      <Card key={index}>
        <div className="h-6 w-32 bg-gray-200 rounded mb-4 animate-pulse" />
        <div className="space-y-4">
          <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
        </div>
      </Card>
    ))}
  </div>
);

const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-12">
    <div className="text-red-600 mb-4">⚠️</div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Policies</h3>
    <p className="text-sm text-gray-500">{message}</p>
  </div>
);
