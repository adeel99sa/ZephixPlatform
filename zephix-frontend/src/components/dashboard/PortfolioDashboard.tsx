import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardBody, CardHeader } from '@/components/ui/card/Card';
import { Skeleton } from '@/components/ui/feedback/Skeleton';
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function PortfolioDashboard() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);
  
  // Set up token getter for API client
  useEffect(() => {
    apiClient.setTokenGetter(() => accessToken);
  }, [accessToken]);

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
    refetchOnWindowFocus: false, // avoid surprise refetches
    retry: (count, err: any) => { // don't hammer on 429
      if (err?.response?.status === 429) return false;
      return count < 2;
    },
  });

  // Fetch sparkline data (mock for now, will be replaced with real API)
  const {
    data: sparklineData,
    isLoading: isSparklineLoading,
  } = useQuery({
    queryKey: ['portfolio-sparkline'],
    queryFn: async () => {
      // TODO: Replace with real API endpoint when available
      // For now, generate mock data for the last 8 weeks
      const weeks = [];
      const now = new Date();
      for (let i = 7; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - (i * 7));
        weeks.push({
          week: `W${8-i}`,
          date: date.toISOString().split('T')[0],
          projects: Math.floor(Math.random() * 20) + (portfolio?.totalProjects || 10) - 10,
        });
      }
      return weeks;
    },
    enabled: !!portfolio,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const handleTileClick = (status: string) => {
    navigate(`/projects?status=${status}`);
  };

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
    // Safely extract error message from various error formats
    let errorMessage = 'Failed to load portfolio data';
    
    if (error && typeof error === 'object') {
      if ('message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if ('error' in error && typeof error.error === 'string') {
        errorMessage = error.error;
      } else if (error.toString && typeof error.toString === 'function') {
        errorMessage = error.toString();
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    return (
      <div className="p-6">
        <ErrorBanner
          description={errorMessage}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleTileClick('all')}
        >
          <CardBody>
            <p className="text-sm text-muted-foreground">Total Projects</p>
            <p className="text-3xl font-bold">{portfolio.totalProjects}</p>
            <p className="text-xs text-muted-foreground mt-1">Click to view all</p>
          </CardBody>
        </Card>

        <Card 
          className="bg-green-50 border-green-200 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleTileClick('on-track')}
        >
          <CardBody>
            <p className="text-sm text-green-600">On Track</p>
            <p className="text-3xl font-bold text-green-700">{portfolio.projectsOnTrack}</p>
            <p className="text-xs text-green-600 mt-1">Click to filter</p>
          </CardBody>
        </Card>

        <Card 
          className="bg-yellow-50 border-yellow-200 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleTileClick('at-risk')}
        >
          <CardBody>
            <p className="text-sm text-yellow-600">At Risk</p>
            <p className="text-3xl font-bold text-yellow-700">{portfolio.projectsAtRisk}</p>
            <p className="text-xs text-yellow-600 mt-1">Click to filter</p>
          </CardBody>
        </Card>

        <Card 
          className="bg-red-50 border-red-200 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleTileClick('off-track')}
        >
          <CardBody>
            <p className="text-sm text-red-600">Off Track</p>
            <p className="text-3xl font-bold text-red-700">{portfolio.projectsOffTrack}</p>
            <p className="text-xs text-red-600 mt-1">Click to filter</p>
          </CardBody>
        </Card>
      </div>

      {/* Additional KPI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/resources')}
        >
          <CardBody>
            <p className="text-sm text-muted-foreground">Resource Utilization</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold">{portfolio.overallResourceUtilization}%</p>
              <div className="w-16 h-8">
                {isSparklineLoading ? (
                  <Skeleton className="w-full h-full" />
                ) : sparklineData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData}>
                      <Line 
                        type="monotone" 
                        dataKey="projects" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Click to view resources</p>
          </CardBody>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/analytics')}
        >
          <CardBody>
            <p className="text-sm text-muted-foreground">Budget Used</p>
            <p className="text-3xl font-bold">
              ${((portfolio.budgetConsumed || 0) / (portfolio.totalBudget || 1) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ${(portfolio.budgetConsumed || 0).toLocaleString()} of ${(portfolio.totalBudget || 0).toLocaleString()}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Risk Alert */}
      {portfolio.criticalRisks > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardBody>
            <p className="text-red-700 font-medium">⚠️ {portfolio.criticalRisks} critical risks detected</p>
            <p className="text-red-600 text-sm mt-1">Review risk management dashboard for details</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

