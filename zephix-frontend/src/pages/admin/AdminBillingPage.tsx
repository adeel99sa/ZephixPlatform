import { useEffect, useState } from 'react';
import { billingApi, Plan, Subscription, Usage } from '@/services/billingApi';
import { CreditCard, CheckCircle2, XCircle, Calendar, Users, FolderKanban, HardDrive, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/state/AuthContext';

export default function AdminBillingPage() {
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    // Guard: Don't fire requests until auth state is READY
    if (authLoading) {
      return;
    }
    // Only load if user is authenticated
    if (!user) {
      setLoading(false);
      return;
    }
    loadBillingData();
  }, [authLoading, user]);

  const loadBillingData = async () => {
    try {
      setLoading(true);

      // Use Promise.allSettled to handle partial failures gracefully
      const results = await Promise.allSettled([
        billingApi.getPlans().catch(() => []), // Return empty array on failure
        billingApi.getSubscription().catch(() => null), // Return null on failure
        billingApi.getCurrentPlan().catch(() => null), // Return null on failure
        billingApi.getUsage().catch(() => ({
          users: { allowed: null, used: 0 },
          projects: { allowed: null, used: 0 },
          workspaces: { allowed: null, used: 0 },
          storage: { allowed: null, used: 0 },
        })),
      ]);

      // Extract results with safe defaults
      const [plansResult, subscriptionResult, currentPlanResult, usageResult] = results;

      setPlans(plansResult.status === 'fulfilled' ? plansResult.value : []);
      setSubscription(subscriptionResult.status === 'fulfilled' ? subscriptionResult.value : null);
      setCurrentPlan(currentPlanResult.status === 'fulfilled' ? currentPlanResult.value : null);
      setUsage(usageResult.status === 'fulfilled' ? usageResult.value : {
        users: { allowed: null, used: 0 },
        projects: { allowed: null, used: 0 },
        workspaces: { allowed: null, used: 0 },
        storage: { allowed: null, used: 0 },
      });

      // Only show error toast if ALL critical endpoints failed
      const criticalFailures = [
        plansResult.status === 'rejected',
        currentPlanResult.status === 'rejected',
      ].filter(Boolean).length;

      if (criticalFailures === 2) {
        toast.error('Failed to load billing information. Some features may be unavailable.');
      }
    } catch (error) {
      console.error('Failed to load billing data:', error);
      // Don't show error toast here - individual failures are handled above
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: Plan) => {
    try {
      await billingApi.subscribe(plan.type);
      toast.success(`Successfully upgraded to ${plan.name} plan!`);
      await loadBillingData();
      setShowUpgradeModal(false);
    } catch (error: any) {
      // Handle 403 (enterprise managed) and 501 (not implemented) gracefully
      if (error?.response?.status === 403) {
        toast.error(error?.response?.data?.message || 'Plan changes are not allowed for enterprise accounts. Please contact support.');
      } else if (error?.response?.status === 501) {
        toast.info('Plan change feature is not yet available. Please contact support.');
      } else {
        toast.error(error?.response?.data?.message || 'Failed to upgrade plan');
      }
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return;
    }

    try {
      await billingApi.cancelSubscription();
      toast.success('Subscription cancelled successfully');
      await loadBillingData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to cancel subscription');
    }
  };

  // Show loading state while auth is hydrating or billing data is loading
  if (authLoading || loading) {
    return <div className="text-gray-500">Loading billing information...</div>;
  }

  // If no user after auth is ready, show message
  if (!user) {
    return <div className="text-gray-500">Please log in to view billing information.</div>;
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800',
      past_due: 'bg-yellow-100 text-yellow-800',
      unpaid: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Plans</h1>
          <p className="text-gray-500 mt-1">Manage your subscription and billing</p>
        </div>
      </div>

      {/* Current Plan - Show even if plans list is empty */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
            {currentPlan ? (
              <p className="text-2xl font-bold text-gray-900 mt-1">{currentPlan.name}</p>
            ) : (
              <p className="text-2xl font-bold text-gray-900 mt-1">Free</p>
            )}
          </div>
          {subscription && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}>
              {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
            </span>
          )}
        </div>

          {subscription && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {subscription.trialEndsAt && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Trial ends: {new Date(subscription.trialEndsAt).toLocaleDateString()}</span>
                </div>
              )}
              {subscription.currentPeriodEnd && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Next billing: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
                </div>
              )}
              {currentPlan && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CreditCard className="h-4 w-4" />
                  <span>${currentPlan.price.toFixed(2)}/{currentPlan.billingCycle === 'monthly' ? 'month' : 'year'}</span>
                </div>
              )}
            </div>
          )}

          {/* Show message if plan is managed internally */}
          {subscription?.metadata?.internalManaged && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Plan managed by Zephix team.</strong> Contact support to modify your plan.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            {subscription?.metadata?.internalManaged ? (
              <button
                disabled
                className="px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
              >
                Plan Change Disabled (Enterprise)
              </button>
            ) : (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Change Plan
              </button>
            )}
            {subscription && subscription.status === 'active' && !subscription.metadata?.internalManaged && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>

      {/* Usage Limits */}
      {usage && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage & Limits</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Users</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {usage.users.used} {usage.users.allowed !== null ? `/ ${usage.users.allowed}` : ''}
              </p>
              {usage.users.allowed !== null && usage.users.used >= usage.users.allowed && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Limit reached
                </p>
              )}
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FolderKanban className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Projects</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {usage.projects.used} {usage.projects.allowed !== null ? `/ ${usage.projects.allowed}` : ''}
              </p>
              {usage.projects.allowed !== null && usage.projects.used >= usage.projects.allowed && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Limit reached
                </p>
              )}
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FolderKanban className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Workspaces</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {usage.workspaces.used} {usage.workspaces.allowed !== null ? `/ ${usage.workspaces.allowed}` : ''}
              </p>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Storage</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {usage.storage.used} GB {usage.storage.allowed !== null ? `/ ${usage.storage.allowed} GB` : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
        {plans.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No plans available at this time.</p>
            <p className="text-sm mt-2">Please contact support for plan information.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
            <div
              key={plan.id}
              className={`border rounded-lg p-6 ${
                currentPlan?.id === plan.id
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200'
              }`}
            >
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-3xl font-extrabold text-gray-900 mt-2">
                  ${plan.price.toFixed(2)}
                  <span className="text-sm font-normal text-gray-500">
                    /{plan.billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </p>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.featureList.slice(0, 5).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {currentPlan?.id === plan.id ? (
                <button
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {plan.type === 'starter' ? 'Downgrade' : 'Upgrade'} to {plan.name}
                </button>
              )}
            </div>
          ))}
          </div>
        )}
      </div>
    </div>
  );
}


