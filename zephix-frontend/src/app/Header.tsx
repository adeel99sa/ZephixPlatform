import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import ProfileMenu from './ProfileMenu';

interface HealthResponse {
  status: string;
  timestamp?: string;
}

function ApiHealthChip() {
  const { data, isFetching, error } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      try {
        const response = await apiClient.get<{ data?: HealthResponse } | HealthResponse>('/health', { 
          signal: controller.signal,
          timeout: 5000 
        });
        clearTimeout(timeoutId);
        // Handle both { data: HealthResponse } and HealthResponse shapes
        const result = response.data as { data?: HealthResponse } | HealthResponse;
        return ('data' in result && result.data) ? result.data : result as HealthResponse;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    },
    staleTime: 60_000,
    retry: (failureCount, error) => {
      // Exponential backoff: 5s, 10s, 20s, 40s, 60s max
      const delay = Math.min(5000 * Math.pow(2, failureCount), 60000);
      return failureCount < 5 && delay < 60000;
    },
    retryDelay: (attemptIndex) => Math.min(5000 * Math.pow(2, attemptIndex), 60000),
  });
  
  const ok = !!data?.status && data.status !== 'error' && !error;
  return (
    <span className={`ml-3 text-xs px-2 py-1 rounded-full border
      ${ok ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
      {isFetching ? 'Checking…' : ok ? 'API: healthy' : 'API: degraded'}
    </span>
  );
}

export default function Header() {
  return (
    <header className="h-14 border-b flex items-center justify-between px-4">
      {/* left: breadcrumbs / search... */}
      <div className="flex-1" />
      {/* right: profile */}
      <div className="flex items-center">
        <ApiHealthChip />
        <ProfileMenu />
      </div>
    </header>
  );
}
