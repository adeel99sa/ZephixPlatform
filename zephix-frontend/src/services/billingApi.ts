import { apiClient } from '@/lib/api/client';
import { unwrapData, unwrapArray } from '@/lib/api/unwrapData';

export interface Plan {
  id: string;
  name: string;
  type: 'starter' | 'professional' | 'enterprise';
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: {
    maxUsers?: number | null;
    maxProjects?: number | null;
    maxWorkspaces?: number | null;
    storageGB?: number | null;
    aiInsights?: boolean;
    advancedAnalytics?: boolean;
    customIntegrations?: boolean;
    prioritySupport?: boolean;
    apiAccess?: boolean;
    whiteLabeling?: boolean;
    dedicatedSupport?: boolean;
  };
  featureList: string[];
  isActive: boolean;
}

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  status: 'trial' | 'active' | 'cancelled' | 'past_due' | 'unpaid';
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
  autoRenew: boolean;
  plan: Plan;
}

export interface Usage {
  users: { allowed: number | null; used: number };
  projects: { allowed: number | null; used: number };
  workspaces: { allowed: number | null; used: number };
  storage: { allowed: number | null; used: number };
}

class BillingApiService {
  async getPlans(): Promise<Plan[]> {
    const response = await apiClient.get('/billing/plans');
    // Backend returns { data: Plan[] }
    return unwrapArray<Plan>(response);
  }

  async getSubscription(): Promise<Subscription | null> {
    const response = await apiClient.get('/billing/subscription');
    // Backend returns { data: Subscription | null }
    return unwrapData<Subscription>(response);
  }

  async getCurrentPlan(): Promise<Plan> {
    const response = await apiClient.get('/billing/current-plan');
    // Backend returns { data: CurrentPlan }
    return unwrapData<Plan>(response) || {} as Plan;
  }

  async subscribe(planType: 'starter' | 'professional' | 'enterprise', annual?: boolean): Promise<Subscription> {
    const { data } = await apiClient.post('/billing/subscribe', {
      planType,
      annual: annual || false,
    });
    return data;
  }

  async updateSubscription(updates: {
    planType?: 'starter' | 'professional' | 'enterprise';
    autoRenew?: boolean;
  }): Promise<Subscription> {
    const { data } = await apiClient.patch('/billing/subscription', updates);
    return data;
  }

  async cancelSubscription(): Promise<Subscription> {
    const { data } = await apiClient.post('/billing/cancel');
    return data;
  }

  async getUsage(): Promise<Usage> {
    const response = await apiClient.get('/billing/usage');
    // Backend returns { data: Usage }
    return unwrapData<Usage>(response) || {} as Usage;
  }
}

export const billingApi = new BillingApiService();


