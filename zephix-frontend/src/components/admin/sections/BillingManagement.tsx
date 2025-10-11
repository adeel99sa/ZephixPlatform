import React from 'react';
import { CreditCardIcon } from '@heroicons/react/24/outline';

export const BillingManagement: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <CreditCardIcon className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Seats</h1>
          <p className="text-gray-600">Manage subscription and billing</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <CreditCardIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Billing Management Coming Soon</h3>
        <p className="text-gray-600">
          View usage, manage seats, update payment methods, and handle billing inquiries.
        </p>
      </div>
    </div>
  );
};













