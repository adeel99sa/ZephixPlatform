import { apiClient } from '@/lib/api/client';

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
    const { data } = await apiClient.get('/billing/plans');
    return data;
  }

  async getSubscription(): Promise<Subscription | null> {
    const { data } = await apiClient.get('/billing/subscription');
    return data;
  }

  async getCurrentPlan(): Promise<Plan> {
    const { data } = await apiClient.get('/billing/current-plan');
    return data;
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
    const { data } = await apiClient.get('/billing/usage');
    return data;
  }
}

export const billingApi = new BillingApiService();

