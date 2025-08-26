import React from 'react';
import { Building2, Users, Shield, CreditCard, Database, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';

export const OrganizationOverview = () => {
  // Mock data - replace with API calls
  const orgData = {
    profile: {
      name: 'Zephix Organization',
      domain: 'zephix.ai',
      industry: 'Technology',
      size: 'Enterprise',
      createdAt: '2024-01-01',
      status: 'active'
    },
    plan: {
      name: 'Enterprise Pro',
      features: ['AI Features', 'Advanced Analytics', 'Priority Support'],
      limits: {
        users: 1000,
        projects: 500,
        storage: '1TB'
      },
      nextBilling: '2024-12-01'
    },
    usage: {
      users: {
        total: 45,
        active: 38,
        inactive: 7
      },
      projects: {
        total: 23,
        active: 18,
        completed: 5
      },
      storage: {
        used: '45GB',
        available: '955GB'
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Organization Overview</h1>
        <Badge className="bg-green-100 text-green-800">
          {orgData.profile.status}
        </Badge>
      </div>

      {/* Organization Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-lg font-semibold">{orgData.profile.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Domain</label>
                <p className="text-lg">{orgData.profile.domain}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Industry</label>
                <p className="text-lg">{orgData.profile.industry}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Size</label>
                <p className="text-lg">{orgData.profile.size}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-lg">{new Date(orgData.profile.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <Badge className="bg-green-100 text-green-800">
                  {orgData.profile.status}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold">{orgData.plan.name}</h3>
                <p className="text-gray-500">Next billing: {new Date(orgData.plan.nextBilling).toLocaleDateString()}</p>
              </div>
              <Badge className="bg-blue-100 text-blue-800">Active</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{orgData.plan.limits.users}</div>
                <div className="text-sm text-gray-500">Users</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{orgData.plan.limits.projects}</div>
                <div className="text-sm text-gray-500">Projects</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{orgData.plan.limits.storage}</div>
                <div className="text-sm text-gray-500">Storage</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Features</h4>
              <div className="flex flex-wrap gap-2">
                {orgData.plan.features.map((feature, index) => (
                  <Badge key={index} className="bg-green-100 text-green-800">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{orgData.usage.users.total}</div>
                <div className="text-sm text-gray-500">Total Users</div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-xl font-semibold text-green-600">{orgData.usage.users.active}</div>
                  <div className="text-xs text-gray-500">Active</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-red-600">{orgData.usage.users.inactive}</div>
                  <div className="text-xs text-gray-500">Inactive</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{orgData.usage.projects.total}</div>
                <div className="text-sm text-gray-500">Total Projects</div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-xl font-semibold text-blue-600">{orgData.usage.projects.active}</div>
                  <div className="text-xs text-gray-500">Active</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-green-600">{orgData.usage.projects.completed}</div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{orgData.usage.storage.used}</div>
                <div className="text-sm text-gray-500">Used</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-600">{orgData.usage.storage.available}</div>
                <div className="text-xs text-gray-500">Available</div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${(45 / 1000) * 100}%` }}
                ></div>
              </div>
              <div className="text-center text-xs text-gray-500">
                {((45 / 1000) * 100).toFixed(1)}% used
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
