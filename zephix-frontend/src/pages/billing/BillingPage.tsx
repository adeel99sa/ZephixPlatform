import { useEffect, useState } from 'react';
import { billingApi, Plan, Subscription, Usage } from '@/services/billingApi';
import {
  CreditCard, CheckCircle2, XCircle, Calendar, Users, FolderKanban,
  HardDrive, AlertCircle, Sparkles, ArrowRight, Crown, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/state/AuthContext';

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
      const [plansData, subscriptionData, currentPlanData, usageData] = await Promise.all([
        billingApi.getPlans(),
        billingApi.getSubscription(),
        billingApi.getCurrentPlan(),
        billingApi.getUsage(),
      ]);
      setPlans(plansData);
      setSubscription(subscriptionData);
      setCurrentPlan(currentPlanData);
      setUsage(usageData);
    } catch (error) {
      console.error('Failed to load billing data:', error);
      toast.error('Failed to load billing information');
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
      setSelectedPlan(null);
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading billing information...</div>
        </div>
      </div>
    );
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

  const getPlanIcon = (type: string) => {
    switch (type) {
      case 'starter':
        return Zap;
      case 'professional':
        return Sparkles;
      case 'enterprise':
        return Crown;
      default:
        return CreditCard;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing & Plans</h1>
        <p className="text-gray-500 mt-1">Manage your subscription and billing</p>
      </div>

      {/* Current Plan Card */}
      {currentPlan && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {(() => {
                  const Icon = getPlanIcon(currentPlan.type);
                  return <Icon className="h-6 w-6 text-blue-600" />;
                })()}
                <h2 className="text-2xl font-bold text-gray-900">Current Plan: {currentPlan.name}</h2>
              </div>
              <p className="text-gray-600">
                {currentPlan.type === 'starter'
                  ? 'You\'re on our free plan. Upgrade to unlock more features!'
                  : `You're subscribed to ${currentPlan.name}. Thank you for your support!`
                }
              </p>
            </div>
            {subscription && (
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}>
                {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
              </span>
            )}
          </div>

          {subscription && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {subscription.trialEndsAt && (
                <div className="flex items-center gap-2 text-sm text-gray-700 bg-white/50 rounded-lg p-3">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="font-medium">Trial Ends</p>
                    <p className="text-xs text-gray-600">{new Date(subscription.trialEndsAt).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
              {subscription.currentPeriodEnd && (
                <div className="flex items-center gap-2 text-sm text-gray-700 bg-white/50 rounded-lg p-3">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="font-medium">Next Billing</p>
                    <p className="text-xs text-gray-600">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-700 bg-white/50 rounded-lg p-3">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="font-medium">Price</p>
                  <p className="text-xs text-gray-600">
                    ${currentPlan.price.toFixed(2)}/{currentPlan.billingCycle === 'monthly' ? 'month' : 'year'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {subscription && subscription.status === 'active' && currentPlan.type !== 'starter' && (
            <button
              onClick={handleCancel}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Cancel Subscription
            </button>
          )}
        </div>
      )}

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
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = getPlanIcon(plan.type);
            const isCurrent = currentPlan?.id === plan.id;
            const isUpgrade = currentPlan && (
              (plan.type === 'professional' && currentPlan.type === 'starter') ||
              (plan.type === 'enterprise' && (currentPlan.type === 'starter' || currentPlan.type === 'professional'))
            );

            return (
              <div
                key={plan.id}
                className={`relative border-2 rounded-xl p-6 transition-all ${
                  isCurrent
                    ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50'
                    : isUpgrade
                    ? 'border-indigo-300 hover:border-indigo-500 hover:shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold">
                    Current Plan
                  </div>
                )}

                {plan.type === 'professional' && !isCurrent && (
                  <div className="absolute -top-3 right-4 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                    Most Popular
                  </div>
                )}

                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${
                      plan.type === 'starter' ? 'bg-gray-100' :
                      plan.type === 'professional' ? 'bg-indigo-100' :
                      'bg-purple-100'
                    }`}>
                      <Icon className={`h-6 w-6 ${
                        plan.type === 'starter' ? 'text-gray-600' :
                        plan.type === 'professional' ? 'text-indigo-600' :
                        'text-purple-600'
                      }`} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  </div>
                  <div className="mb-2">
                    <span className="text-4xl font-extrabold text-gray-900">
                      ${plan.price.toFixed(2)}
                    </span>
                    <span className="text-gray-500 ml-2">
                      /{plan.billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  {plan.type === 'starter' && (
                    <p className="text-sm text-gray-600">Perfect for small teams getting started</p>
                  )}
                  {plan.type === 'professional' && (
                    <p className="text-sm text-gray-600">For growing teams that need advanced features</p>
                  )}
                  {plan.type === 'enterprise' && (
                    <p className="text-sm text-gray-600">For large organizations requiring advanced security</p>
                  )}
                </div>

                <ul className="space-y-2 mb-6 min-h-[200px]">
                  {plan.featureList.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed font-medium"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setShowUpgradeModal(true);
                    }}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      isUpgrade
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {plan.type === 'starter' ? 'Downgrade' : 'Upgrade'} to {plan.name}
                    {isUpgrade && <ArrowRight className="h-4 w-4" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Upgrade to {selectedPlan.name}</h3>
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                You're about to upgrade to the <strong>{selectedPlan.name}</strong> plan at{' '}
                <strong>${selectedPlan.price.toFixed(2)}/{selectedPlan.billingCycle === 'monthly' ? 'month' : 'year'}</strong>.
              </p>
              {subscription?.trialEndsAt && new Date(subscription.trialEndsAt) > new Date() && (
                <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                  Your trial will end on {new Date(subscription.trialEndsAt).toLocaleDateString()}.
                  Billing will begin after the trial period.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  setSelectedPlan(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpgrade(selectedPlan)}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Confirm Upgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


