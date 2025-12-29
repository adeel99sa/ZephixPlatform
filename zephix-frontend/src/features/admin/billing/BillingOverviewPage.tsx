import { CreditCard, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';

export default function BillingOverviewPage() {
  return (
    <div className="p-6" data-testid="admin-billing-root">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          Billing Overview
        </h1>
        <p className="text-gray-600 mt-2">
          View your subscription plan and billing information.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h2>
            <div className="bg-gray-50 rounded-md p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Plan Name</span>
                <span className="text-sm font-semibold text-gray-900">Starter</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Seats Used</span>
                <span className="text-sm font-semibold text-gray-900">0</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing Information</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                Billing and subscription management will be available in a future update.
                For questions about your plan or to upgrade, please contact our sales team.
              </p>
            </div>
          </section>

          <div className="border-t border-gray-200 pt-4">
            <Button
              onClick={() => {
                // TODO: Implement contact sales functionality
                window.location.href = 'mailto:sales@zephix.ai?subject=Billing Inquiry';
              }}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Contact Sales
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              TODO: Integrate with billing system and payment processing
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

















