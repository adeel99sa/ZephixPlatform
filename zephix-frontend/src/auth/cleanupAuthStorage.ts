/**
 * Cleanup function to remove legacy auth tokens from localStorage
 * Called on app startup and logout to ensure no token persistence
 */
export function cleanupLegacyAuthStorage() {
  const keys = ["zephix.at", "zephix.rt", "zephix-auth-storage", "zephix.sessionId", "auth_token", "refresh_token", "accessToken", "refreshToken", "enterprise-auth-token", "enterprise-refresh-token"];
  for (const k of keys) {
    try {
      localStorage.removeItem(k);
    } catch (error) {
      // Ignore errors (e.g., in private browsing mode)
    }
  }
}
