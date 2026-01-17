export function workspaceHome(slug: string) {
  return `/w/${slug}/home`;
}

export function workspaceMembers(slug: string) {
  return `/w/${slug}/members`;
}

export function workspacePrograms(slug: string) {
  return `/w/${slug}/programs`;
}

export function workspacePortfolios(slug: string) {
  return `/w/${slug}/portfolios`;
}

export function isWorkspaceSlugPath(pathname: string) {
  return pathname.startsWith("/w/");
}
