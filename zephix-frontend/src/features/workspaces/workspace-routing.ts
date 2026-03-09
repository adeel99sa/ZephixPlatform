type WorkspaceRouteCandidate = {
  id: string;
  slug?: string | null;
};

type StoredWorkspaceRef = {
  id?: string;
  slug?: string;
  ts?: number;
};

const LAST_KEY = "zephix_last_workspace_v1";
const RECENT_KEY = "zephix_recent_workspaces_v1";

function readStoredLastSlug(): string | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredWorkspaceRef;
    return typeof parsed?.slug === "string" ? parsed.slug : null;
  } catch {
    return null;
  }
}

function readStoredRecentSlugs(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry: StoredWorkspaceRef) =>
        typeof entry?.slug === "string" ? entry.slug : null,
      )
      .filter((slug: string | null): slug is string => Boolean(slug));
  } catch {
    return [];
  }
}

export function pickWorkspaceSlugForRouting(
  workspaces: WorkspaceRouteCandidate[],
  options?: { excludeSlug?: string },
): string | null {
  const normalized = workspaces.filter(
    (workspace): workspace is { id: string; slug: string } =>
      Boolean(workspace?.id && workspace?.slug),
  );
  if (normalized.length === 0) return null;

  const excludeSlug = options?.excludeSlug ?? null;
  const slugs = new Set(normalized.map((workspace) => workspace.slug));
  const storedCandidates = [readStoredLastSlug(), ...readStoredRecentSlugs()];

  for (const candidate of storedCandidates) {
    if (!candidate) continue;
    if (excludeSlug && candidate === excludeSlug) continue;
    if (slugs.has(candidate)) return candidate;
  }

  const first = normalized.find((workspace) => workspace.slug !== excludeSlug);
  return first?.slug ?? normalized[0].slug;
}

