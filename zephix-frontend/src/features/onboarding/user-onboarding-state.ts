type PlatformRole = "ADMIN" | "MEMBER" | "VIEWER" | "GUEST";

const ONBOARDING_PREFIX = "zephix.userOnboarding.v1";

function keyFor(userId: string, role: PlatformRole): string {
  return `${ONBOARDING_PREFIX}:${userId}:${role}`;
}

export function hasCompletedUserOnboarding(
  userId: string | undefined,
  role: PlatformRole | undefined,
): boolean {
  if (!userId || !role) return false;
  if (role === "ADMIN") return true;
  try {
    return localStorage.getItem(keyFor(userId, role)) === "done";
  } catch {
    return false;
  }
}

export function markUserOnboardingCompleted(
  userId: string | undefined,
  role: PlatformRole | undefined,
): void {
  if (!userId || !role) return;
  if (role === "ADMIN") return;
  try {
    localStorage.setItem(keyFor(userId, role), "done");
  } catch {
    // Best effort only.
  }
}

