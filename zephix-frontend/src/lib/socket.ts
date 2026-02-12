// ─────────────────────────────────────────────────────────────────────────────
// Sprint 9 — WebSocket Client
//
// Initializes socket.io connection with cookie-based auth (withCredentials).
// On 'notification' event → invalidates React Query notification keys.
// Auto-reconnect enabled. Fail-open: if socket fails, REST still works.
// ─────────────────────────────────────────────────────────────────────────────

import { io, Socket } from 'socket.io-client';
import { QueryClient } from '@tanstack/react-query';

let socket: Socket | null = null;
let queryClientRef: QueryClient | null = null;

/**
 * Get the API base URL for WebSocket connection.
 * Uses same origin as the API client.
 */
function getSocketUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  if (apiUrl) {
    // Strip trailing /api if present — socket.io connects to root
    return apiUrl.replace(/\/api\/?$/, '');
  }
  // Default to same origin
  return window.location.origin;
}

/**
 * Initialize the WebSocket connection.
 * Call once when the app mounts and the user is authenticated.
 */
export function initSocket(queryClient: QueryClient): Socket {
  if (socket?.connected) {
    return socket;
  }

  queryClientRef = queryClient;

  const url = getSocketUrl();

  socket = io(`${url}/notifications`, {
    withCredentials: true, // Sends zephix_session cookie
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
  });

  socket.on('connect', () => {
    console.debug('[Socket] Connected to notification stream');
  });

  socket.on('disconnect', (reason) => {
    console.debug('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.debug('[Socket] Connection error:', err.message);
    // Fail-open: REST polling still active as fallback
  });

  // Real-time notification event → invalidate React Query cache
  socket.on('notification', () => {
    if (queryClientRef) {
      queryClientRef.invalidateQueries({ queryKey: ['notifications'] });
      queryClientRef.invalidateQueries({ queryKey: ['inbox'] });
    }
  });

  return socket;
}

/**
 * Disconnect the WebSocket.
 * Call on logout or unmount.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  queryClientRef = null;
}

/**
 * Get the current socket instance (may be null if not initialized).
 */
export function getSocket(): Socket | null {
  return socket;
}
