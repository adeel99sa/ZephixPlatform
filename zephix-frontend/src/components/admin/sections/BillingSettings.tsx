import React from 'react';
import { CreditCardIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export const BillingSettings: React.FC = () => {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="mt-2 text-gray-600">
          Manage your subscription, billing, and payment methods
        </p>
      </div>

      <div className="space-y-6">
        {/* Current Plan */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <CreditCardIcon className="h-6 w-6 text-gray-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Current Plan</h2>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
              Active
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Professional</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">$29<span className="text-lg text-gray-500">/month</span></p>
              <p className="text-sm text-gray-500 mt-1">Billed monthly</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Features</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                  Up to 10 users
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                  Unlimited projects
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                  Advanced analytics
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                  Priority support
                </li>
              </ul>
            </div>
            
            <div className="flex flex-col justify-center">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-2">
                Upgrade Plan
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Change Plan
              </button>
            </div>
          </div>
        </div>

        {/* Usage */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage This Month</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Users</span>
                <span className="text-sm text-gray-500">8 / 10</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Projects</span>
                <span className="text-sm text-gray-500">12 / Unlimited</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '60%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Storage</span>
                <span className="text-sm text-gray-500">2.4 GB / 10 GB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '24%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Method</h2>
          
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center mr-3">
                <CreditCardIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">•••• •••• •••• 4242</p>
                <p className="text-sm text-gray-500">Expires 12/25</p>
              </div>
            </div>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Update
            </button>
          </div>
        </div>

        {/* Billing History */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing History</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Professional Plan</p>
                <p className="text-sm text-gray-500">December 2024</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">$29.00</p>
                <p className="text-sm text-green-600">Paid</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Professional Plan</p>
                <p className="text-sm text-gray-500">November 2024</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">$29.00</p>
                <p className="text-sm text-green-600">Paid</p>
              </div>
            </div>
          </div>
          
          <button className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium">
            View All Invoices
          </button>
        </div>
      </div>
    </div>
  );
};
