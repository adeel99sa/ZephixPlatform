import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { Card, CardBody, CardHeader } from '@/components/ui/card/Card';
import { Skeleton } from '@/components/ui/feedback/Skeleton';
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner';

export function PortfolioDashboard() {
  const {
    data: portfolio,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['portfolio-kpi'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.KPI.PORTFOLIO);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardBody>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorBanner
          description={error.message || 'Failed to load portfolio data'}
          onRetry={() => refetch()}
          retryLabel="Retry"
        />
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="p-6">
        <Card>
          <CardBody>
            <p className="text-muted-foreground">No portfolio data available</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardBody>
            <p className="text-sm text-muted-foreground">Total Projects</p>
            <p className="text-3xl font-bold">{portfolio.totalProjects}</p>
          </CardBody>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardBody>
            <p className="text-sm text-green-600">On Track</p>
            <p className="text-3xl font-bold text-green-700">{portfolio.projectsOnTrack}</p>
          </CardBody>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardBody>
            <p className="text-sm text-yellow-600">At Risk</p>
            <p className="text-3xl font-bold text-yellow-700">{portfolio.projectsAtRisk}</p>
          </CardBody>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardBody>
            <p className="text-sm text-red-600">Off Track</p>
            <p className="text-3xl font-bold text-red-700">{portfolio.projectsOffTrack}</p>
          </CardBody>
        </Card>
      </div>

      {/* Resource Utilization */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">Resource Utilization</h2>
        </CardHeader>
        <CardBody>
          <div className="flex items-center">
            <div className="flex-1 bg-gray-200 rounded-full h-4 mr-4">
              <div
                className={`h-4 rounded-full ${
                  portfolio.overallResourceUtilization > 100 ? 'bg-red-500' :
                  portfolio.overallResourceUtilization > 80 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(portfolio.overallResourceUtilization, 100)}%` }}
              />
            </div>
            <span className="font-bold">{portfolio.overallResourceUtilization}%</span>
          </div>
        </CardBody>
      </Card>

      {/* Budget Overview */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Budget Overview</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Budget</p>
              <p className="text-xl font-bold">${(portfolio.totalBudget || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Consumed</p>
              <p className="text-xl font-bold">${(portfolio.budgetConsumed || 0).toLocaleString()}</p>
            </div>
          </div>
          
          {portfolio.criticalRisks > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded border border-red-200">
              <p className="text-red-700 font-medium">⚠️ {portfolio.criticalRisks} critical risks detected</p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

