import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/state/AuthContext";
import { isPaidUser } from "@/utils/roles";

/**
 * Hook to poll unread notification count every 30 seconds
 * Only runs for paid users (Admin and Member)
 * Stops polling on logout
 */
export function useUnreadNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const loadUnreadCount = async () => {
    if (!user || !isPaidUser(user)) {
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      const data = await api.get<{ count: number }>("/notifications/unread-count");
      setUnreadCount(data.count);
    } catch (error) {
      // Silent fail for polling
      console.warn("[useUnreadNotifications] Failed to load unread count:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isPaid = user && isPaidUser(user);
    const hasToken = !!localStorage.getItem("zephix.at");

    // Only poll for paid users with valid token
    if (!isPaid || !hasToken) {
      setUnreadCount(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Don't poll when tab is hidden
    const isVisible = document.visibilityState === 'visible';
    if (!isVisible) {
      return;
    }

    // Load immediately
    loadUnreadCount();

    // Poll every 30 seconds
    intervalRef.current = window.setInterval(() => {
      // Check visibility before polling
      if (document.visibilityState === 'visible' && isPaidUser(user)) {
        loadUnreadCount();
      }
    }, 30000);

    // Cleanup on unmount or user change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user]); // Only depend on user, not isPaidUser result

  return { unreadCount, loading, refresh: loadUnreadCount };
}
