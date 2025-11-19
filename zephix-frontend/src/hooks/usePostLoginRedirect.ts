import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

export function usePostLoginRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkDashboardsAndRedirect = async () => {
      try {
        // Check if user has any dashboards
        const response = await api.get('/api/dashboards?limit=1');
        const dashboards = response.data?.data || [];
        
        if (dashboards.length > 0) {
          // User has dashboards, redirect to dashboards index
          navigate('/dashboards', { replace: true });
        } else {
          // No dashboards, redirect to home
          navigate('/home', { replace: true });
        }
      } catch (error) {
        console.error('Error checking dashboards:', error);
        // Fallback to home on error
        navigate('/home', { replace: true });
      }
    };

    checkDashboardsAndRedirect();
  }, [navigate]);
}
