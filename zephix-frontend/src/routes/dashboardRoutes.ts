export const dashboardRoutes = {
  orgList: '/org/dashboards',
  orgView: (dashboardId: string) => `/org/dashboards/${dashboardId}`,
  wsList: (workspaceId: string) => `/workspaces/${workspaceId}/dashboards`.replace('//', '/'),
  wsView: (workspaceId: string, dashboardId: string) =>
    `/workspaces/${workspaceId}/dashboards/${dashboardId}`,
};
