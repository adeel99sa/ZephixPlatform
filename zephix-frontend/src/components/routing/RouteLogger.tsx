/**
 * Route Logger Component
 *
 * Logs route changes for observability when debugging "page does nothing" issues.
 * Tracks admin route outcomes for regression detection.
 * Logs: route, userId, orgId, isAdmin, outcome
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/state/AuthContext';

interface RouteOutcome {
  route: string;
  userId: string;
  orgId: string;
  isAdmin: boolean;
  outcome: 'render_success' | 'redirect_403' | 'error_banner' | 'unknown';
  timestamp: string;
}

// Track admin route outcomes
const adminRouteOutcomes: RouteOutcome[] = [];

export function RouteLogger() {
  const location = useLocation();
  const { user } = useAuth();
  const prevPathRef = useRef<string>('');

  useEffect(() => {
    // Skip if route hasn't changed
    if (prevPathRef.current === location.pathname) {
      return;
    }
    prevPathRef.current = location.pathname;

    const isAdminRoute = location.pathname.startsWith('/admin');
    const userId = user?.id || 'anonymous';
    const orgId = user?.organizationId || 'none';
    const isAdmin = user?.permissions?.isAdmin || false;

    // Determine outcome for admin routes
    let outcome: RouteOutcome['outcome'] = 'unknown';
    if (isAdminRoute) {
      // Check for error banners (common selectors)
      const errorBanner = document.querySelector('[role="alert"], .error-banner, [data-testid*="error"]');
      if (errorBanner) {
        outcome = 'error_banner';
      } else if (location.pathname === '/403') {
        outcome = 'redirect_403';
      } else {
        // Assume success if we're on the admin route and no errors
        outcome = 'render_success';
      }

      // Track admin route outcome
      const routeOutcome: RouteOutcome = {
        route: location.pathname,
        userId,
        orgId,
        isAdmin,
        outcome,
        timestamp: new Date().toISOString(),
      };
      adminRouteOutcomes.push(routeOutcome);

      // Keep only last 50 outcomes
      if (adminRouteOutcomes.length > 50) {
        adminRouteOutcomes.shift();
      }

      // Log with outcome tracking
      console.log('[Route]', {
        route: location.pathname,
        userId,
        orgId,
        isAdmin,
        outcome,
        timestamp: routeOutcome.timestamp,
        adminRouteOutcomes: adminRouteOutcomes.filter(r => r.route.startsWith('/admin')).length,
      });
    } else {
      // Log non-admin routes normally
      console.log('[Route]', {
        route: location.pathname,
        userId,
        orgId,
        isAdmin,
        timestamp: new Date().toISOString(),
      });
    }
  }, [location.pathname, user?.id, user?.organizationId, user?.permissions?.isAdmin]);

  return null; // This component doesn't render anything
}

// Export for telemetry integration later
export function getAdminRouteOutcomes(): RouteOutcome[] {
  return [...adminRouteOutcomes];
}

export function getAdminRouteStats(): {
  total: number;
  success: number;
  redirect403: number;
  errorBanner: number;
} {
  const adminRoutes = adminRouteOutcomes.filter(r => r.route.startsWith('/admin'));
  return {
    total: adminRoutes.length,
    success: adminRoutes.filter(r => r.outcome === 'render_success').length,
    redirect403: adminRoutes.filter(r => r.outcome === 'redirect_403').length,
    errorBanner: adminRoutes.filter(r => r.outcome === 'error_banner').length,
  };
}

