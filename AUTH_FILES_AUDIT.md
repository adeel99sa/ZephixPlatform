# AUTHENTICATION FILES AUDIT

## Files using useEnterpriseAuth:
zephix-frontend/src/stores/enterpriseAuthStore.ts:export const useEnterpriseAuthStore = create<EnterpriseAuthState>((set, get) => ({
zephix-frontend/src/components/auth/RequireAdmin.tsx:import { useEnterpriseAuth } from '../../hooks/useEnterpriseAuth';
zephix-frontend/src/components/auth/RequireAdmin.tsx:  const { user, isLoading } = useEnterpriseAuth();
zephix-frontend/src/hooks/useEnterpriseAuth.ts:export const useEnterpriseAuth = () => {
zephix-frontend/src/pages/auth/LoginPage.tsx:import { useEnterpriseAuth } from '../../hooks/useEnterpriseAuth';
zephix-frontend/src/pages/auth/LoginPage.tsx:  const { login, user, isAuthenticated, isLoading, error, clearError } = useEnterpriseAuth();
zephix-frontend/src/pages/auth/SignupPage.tsx:import { useEnterpriseAuth } from '../../hooks/useEnterpriseAuth';
zephix-frontend/src/pages/auth/SignupPage.tsx:  const { signup, authState, isLoading, error, clearError } = useEnterpriseAuth();

## Files using useAuth:
zephix-frontend/src/test/utils.tsx:  useAuthStore: () => mockAuthStore,
zephix-frontend/src/stores/authStore.ts:export const useAuthStore = create<AuthState>()(
zephix-frontend/src/stores/authStore.ts:        await useAuthStore.getState().refreshToken();
zephix-frontend/src/stores/authStore.ts:        useAuthStore.getState().logout();
zephix-frontend/src/components/landing/Header.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/components/landing/Header.tsx:  const { user, isLoading } = useAuthStore();
zephix-frontend/src/components/auth/ProtectedRoute.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/components/auth/ProtectedRoute.tsx:  const token = useAuthStore(state => state.accessToken);
zephix-frontend/src/components/auth/ProtectedRoute.tsx:  const user = useAuthStore(state => state.user);
zephix-frontend/src/components/auth/AuthProvider.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/components/auth/AuthProvider.tsx:  const checkAuth = useAuthStore((state) => state.checkAuth);
zephix-frontend/src/components/layout/GlobalHeader.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/components/layout/GlobalHeader.tsx:  const { user, logout } = useAuthStore();
zephix-frontend/src/components/layouts/DashboardLayout.tsx:import { useAuth } from '@/hooks/useAuth';
zephix-frontend/src/components/layouts/DashboardLayout.tsx:  const authData = useAuth();
zephix-frontend/src/components/routing/PublicRoute.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/components/routing/PublicRoute.tsx:  const { isAuthenticated, isLoading } = useAuthStore();
zephix-frontend/src/hooks/useAuth.ts:// File: src/hooks/useAuth.ts
zephix-frontend/src/hooks/useAuth.ts:import { useAuthStore } from '../stores/authStore';
zephix-frontend/src/hooks/useAuth.ts:export const useAuth = () => {
zephix-frontend/src/hooks/useAuth.ts:  const store = useAuthStore();
zephix-frontend/src/hooks/useUser.ts:import { useAuthStore } from '../stores/authStore';
zephix-frontend/src/hooks/useUser.ts:  } = useAuthStore();
zephix-frontend/src/hooks/useApi.ts:import { useAuthStore } from '../stores/authStore';
zephix-frontend/src/hooks/useApi.ts:  const { user } = useAuthStore();
zephix-frontend/src/hooks/useApi.ts:  const { user } = useAuthStore();
zephix-frontend/src/hooks/useEnterpriseAuth.ts:import { useAuthStore } from '../stores/authStore';
zephix-frontend/src/hooks/useEnterpriseAuth.ts:  const { user, accessToken, isAuthenticated, login: storeLogin, logout: storeLogout } = useAuthStore();
zephix-frontend/src/hooks/useEnterpriseAuth.ts:      useAuthStore.setState({
zephix-frontend/src/hooks/useEnterpriseAuth.ts:      useAuthStore.setState({
zephix-frontend/src/pages/pm/project/[id]/status.tsx:import { useAuthStore } from '@/stores/authStore';
zephix-frontend/src/pages/pm/project/[id]/status.tsx:  const { user, isAuthenticated } = useAuthStore();
zephix-frontend/src/pages/settings/SettingsPage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/settings/SettingsPage.tsx:  const { user } = useAuthStore();
zephix-frontend/src/pages/collaboration/CollaborationPage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/collaboration/CollaborationPage.tsx:  const { user } = useAuthStore();
zephix-frontend/src/pages/Dashboard.tsx:import { useAuth } from '@/hooks/useAuth';
zephix-frontend/src/pages/Dashboard.tsx:  const { user, permissions } = useAuth();
zephix-frontend/src/pages/auth/PendingVerificationPage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/auth/PendingVerificationPage.tsx:  const { user } = useAuthStore();
zephix-frontend/src/pages/workflows/WorkflowsPage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/workflows/WorkflowsPage.tsx:  const { user } = useAuthStore();
zephix-frontend/src/pages/intake/IntakeFormsPage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/intake/IntakeFormsPage.tsx:  const { user } = useAuthStore();
zephix-frontend/src/pages/dashboard/DashboardPage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/dashboard/DashboardPage.tsx:  const user = useAuthStore(state => state.user);
zephix-frontend/src/pages/profile/ProfilePage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/profile/ProfilePage.tsx:  const { user, updateUser } = useAuthStore();
zephix-frontend/src/pages/team/TeamPage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/team/TeamPage.tsx:  const { user } = useAuthStore();
zephix-frontend/src/pages/ai/AISuggestionsPage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/ai/AISuggestionsPage.tsx:  const { user } = useAuthStore();
zephix-frontend/src/pages/templates/TemplatesPage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/templates/TemplatesPage.tsx:  const { user } = useAuthStore();
zephix-frontend/src/pages/reports/ReportsPage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/reports/ReportsPage.tsx:  const { user } = useAuthStore();

## Files importing from authStore:
zephix-frontend/src/test/utils.tsx:vi.mock('../stores/authStore', () => ({
zephix-frontend/src/components/landing/Header.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/components/auth/ProtectedRoute.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/components/auth/AuthProvider.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/components/layout/GlobalHeader.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/components/routing/PublicRoute.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/hooks/useAuth.ts:import { useAuthStore } from '../stores/authStore';
zephix-frontend/src/hooks/useUser.ts:import { useAuthStore } from '../stores/authStore';
zephix-frontend/src/hooks/useApi.ts:import { useAuthStore } from '../stores/authStore';
zephix-frontend/src/hooks/useEnterpriseAuth.ts:import { useAuthStore } from '../stores/authStore';
zephix-frontend/src/pages/pm/project/[id]/status.tsx:import { useAuthStore } from '@/stores/authStore';
zephix-frontend/src/pages/settings/SettingsPage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/collaboration/CollaborationPage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/auth/PendingVerificationPage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/workflows/WorkflowsPage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/intake/IntakeFormsPage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/dashboard/DashboardPage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/profile/ProfilePage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/team/TeamPage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/ai/AISuggestionsPage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/templates/TemplatesPage.tsx:import { useAuthStore } from '../../stores/authStore';
zephix-frontend/src/pages/reports/ReportsPage.tsx:import { useAuthStore } from '../../stores/authStore';

## Files importing API clients:
zephix-frontend/src/utils/authTestRunner.ts:import { authApi } from '../services/api';
zephix-frontend/src/utils/authTestRunner.ts:      const response = await authApi.register(testUserData);
zephix-frontend/src/utils/authTestRunner.ts:      const response = await authApi.login(testCredentials);
zephix-frontend/src/utils/authTestRunner.ts:        await authApi.login(invalidCredentials);
zephix-frontend/src/utils/authTestRunner.ts:        await authApi.login(malformedData as any);
zephix-frontend/src/components/pm/risk-management/RiskRegister.tsx:import { apiJson } from '../../../services/api';
zephix-frontend/src/components/pm/risk-management/RiskRegister.tsx:        const data = await apiJson(`/pm/risk-management/register/${projectId}`);
zephix-frontend/src/components/pm/risk-management/RiskManagementDashboard.tsx:import { apiJson } from '../../../services/api';
zephix-frontend/src/components/pm/risk-management/RiskManagementDashboard.tsx:      const data = await apiJson(`/pm/risk-management/register/${projectId}`);
zephix-frontend/src/components/pm/risk-management/RiskManagementDashboard.tsx:      const data = await apiJson(`/pm/risk-management/analyze`, {
zephix-frontend/src/components/pm/risk-management/RiskManagementDashboard.tsx:      const data = await apiJson(`/pm/risk-management/forecasting/${projectId}`);
zephix-frontend/src/components/ChatInterface.tsx:import { aiApi, apiJson } from '../services/api';
zephix-frontend/src/components/ChatInterface.tsx:      const response = await apiJson('/ai-chat/quick-actions');
zephix-frontend/src/components/ChatInterface.tsx:      const data = await apiJson('/ai-chat/send-message', {
zephix-frontend/src/components/intelligence/DocumentIntelligence.tsx:import { apiJson } from '../../services/api';
zephix-frontend/src/components/intelligence/DocumentIntelligence.tsx:      const response = await apiJson('/ai-intelligence/pm-document-upload', {
zephix-frontend/src/components/auth/ForgotPassword.tsx:import { authApi } from '../../api/auth';
zephix-frontend/src/components/auth/ForgotPassword.tsx:      await authApi.forgotPassword(email);
zephix-frontend/src/components/projects/TaskManagement.tsx:import { apiJson } from '../../services/api';
zephix-frontend/src/components/projects/TaskManagement.tsx:      const users = await apiJson('/users/available');
zephix-frontend/src/components/projects/TaskManagement.tsx:      const data = await apiJson(`/projects/${projectId}/tasks`);
zephix-frontend/src/components/projects/TaskManagement.tsx:      await apiJson(`/projects/${projectId}/tasks/${taskId}`, {
zephix-frontend/src/components/projects/TaskManagement.tsx:      await apiJson(`/projects/${projectId}/tasks/${taskId}/progress`, {
zephix-frontend/src/components/projects/TaskManagement.tsx:      await apiJson(`/projects/${projectId}/tasks/${updatedTask.id}`, {
zephix-frontend/src/components/projects/TaskManagement.tsx:      await apiJson(`/projects/${projectId}/tasks`, {
zephix-frontend/src/components/intake/NaturalLanguageDesigner.tsx:import { apiJson } from '../../services/api';
zephix-frontend/src/components/intake/NaturalLanguageDesigner.tsx:      const result: GeneratedFormResult = await apiJson('/pm/intake-designer/generate', {
zephix-frontend/src/components/intake/NaturalLanguageDesigner.tsx:      const refinedForm: GeneratedFormResult = await apiJson('/pm/intake-designer/temp/refine', {
zephix-frontend/src/components/intake/NaturalLanguageDesigner.tsx:      const result = await apiJson('/pm/intake-designer/temp/deploy', {
zephix-frontend/src/components/dashboard/AIIntelligenceDashboard.tsx:import { apiJson } from '../../services/api';
zephix-frontend/src/components/dashboard/AIIntelligenceDashboard.tsx:        const insights = await apiJson(`/ai-intelligence/project-insights/${projectId || 'demo'}`);
zephix-frontend/src/components/dashboard/AIIntelligenceDashboard.tsx:        const capabilities = await apiJson('/ai-intelligence/ai-capabilities');
zephix-frontend/src/components/dashboard/AIIntelligenceDashboard.tsx:        const value = await apiJson('/ai-intelligence/ai-value-propositions');
zephix-frontend/src/hooks/useStatusReporting.ts:import { apiJson } from '../services/api';
zephix-frontend/src/hooks/useStatusReporting.ts:      const data = await apiJson('/pm/status-reporting/generate', {
zephix-frontend/src/hooks/useStatusReporting.ts:      return await apiJson(`/pm/status-reporting/${projectId}/metrics`);
zephix-frontend/src/hooks/useStatusReporting.ts:      return await apiJson(`/pm/status-reporting/${projectId}/trends`);
zephix-frontend/src/hooks/useStatusReporting.ts:      return await apiJson(`/pm/status-reporting/${reportId}/export`, {
zephix-frontend/src/hooks/useStatusReporting.ts:      return await apiJson(`/pm/status-reporting/${projectId}/alerts/configure`, {
zephix-frontend/src/hooks/useProjectInitiation.ts:import { apiJson } from '../services/api';
zephix-frontend/src/hooks/useProjectInitiation.ts:    return apiJson(options.url, {
zephix-frontend/src/hooks/useApi.ts:import { apiJson } from '../services/api';
zephix-frontend/src/hooks/useApi.ts:      const response = await apiJson(endpoint, {
zephix-frontend/src/hooks/useApi.ts:      const response = await apiJson(targetEndpoint, {
zephix-frontend/src/hooks/useEnterpriseAuth.ts:import { apiJson } from '../services/api';
zephix-frontend/src/hooks/useEnterpriseAuth.ts:      const res = await apiJson('/auth/login', { method: 'POST', body: { email, password } });
zephix-frontend/src/hooks/useEnterpriseAuth.ts:      const res = await apiJson('/auth/signup', { method: 'POST', body: userData });
zephix-frontend/src/hooks/useEnterpriseAuth.ts:      await apiJson('/auth/logout', { method: 'POST' });
zephix-frontend/src/pages/settings/SettingsPage.tsx:import { apiJson } from '../../services/api';
zephix-frontend/src/pages/settings/SettingsPage.tsx:      const orgResponse = await apiJson('/organizations/settings', {
zephix-frontend/src/pages/settings/SettingsPage.tsx:      const userResponse = await apiJson('/users/settings', {
zephix-frontend/src/pages/settings/SettingsPage.tsx:      const securityResponse = await apiJson('/organizations/security', {
zephix-frontend/src/pages/settings/SettingsPage.tsx:      const response = await apiJson('/organizations/settings', {
zephix-frontend/src/pages/settings/SettingsPage.tsx:      const response = await apiJson('/users/settings', {
zephix-frontend/src/pages/settings/SettingsPage.tsx:      const response = await apiJson('/organizations/security', {
zephix-frontend/src/pages/collaboration/CollaborationPage.tsx:import { apiJson } from '../../services/api';
zephix-frontend/src/pages/collaboration/CollaborationPage.tsx:      const response = await apiJson('/collaboration', {
zephix-frontend/src/pages/collaboration/CollaborationPage.tsx:      const response = await apiJson(`/collaboration/${itemId}/status`, {
zephix-frontend/src/pages/auth/EmailVerificationPage.tsx:import { apiJson } from '../../services/api';
zephix-frontend/src/pages/auth/EmailVerificationPage.tsx:      const data = await apiJson(`/auth/verify-email/${verificationToken}`);
zephix-frontend/src/pages/auth/PendingVerificationPage.tsx:import { apiJson } from '../../services/api';
zephix-frontend/src/pages/auth/PendingVerificationPage.tsx:        await apiJson('/auth/resend-verification', {
zephix-frontend/src/pages/auth/LoginPage.tsx.bak:import { authApi } from '../../services/api';
zephix-frontend/src/pages/auth/LoginPage.tsx.bak:      const data = await authApi.login({
zephix-frontend/src/pages/workflows/WorkflowsPage.tsx:import { apiJson } from '../../services/api';
zephix-frontend/src/pages/workflows/WorkflowsPage.tsx:      const response = await apiJson('/workflows/templates', {
zephix-frontend/src/pages/workflows/WorkflowsPage.tsx:      const response = await apiJson(`/workflows/templates/${workflowId}/status`, {
zephix-frontend/src/pages/intake/IntakeFormsPage.tsx:import { apiJson } from '../../services/api';
zephix-frontend/src/pages/intake/IntakeFormsPage.tsx:      const response = await apiJson('/intake/forms', {
zephix-frontend/src/pages/intake/IntakeFormsPage.tsx:      const response = await apiJson(`/intake/forms/${formId}/status`, {
zephix-frontend/src/pages/team/TeamPage.tsx:import { apiJson } from '../../services/api';
zephix-frontend/src/pages/team/TeamPage.tsx:      const response = await apiJson('/organizations/team', {
zephix-frontend/src/pages/team/TeamPage.tsx:      const response = await apiJson(`/organizations/team/${memberId}/status`, {
zephix-frontend/src/pages/ai/AISuggestionsPage.tsx:import { apiJson } from '../../services/api';
zephix-frontend/src/pages/ai/AISuggestionsPage.tsx:      const response = await apiJson('/ai/suggestions', {
zephix-frontend/src/pages/ai/AISuggestionsPage.tsx:      const response = await apiJson(`/ai/suggestions/${suggestionId}/status`, {
zephix-frontend/src/pages/templates/TemplatesPage.tsx:import { apiJson } from '../../services/api';
zephix-frontend/src/pages/templates/TemplatesPage.tsx:      const response = await apiJson('/templates', {
zephix-frontend/src/pages/templates/TemplatesPage.tsx:      const response = await apiJson(`/templates/${templateId}/status`, {
zephix-frontend/src/pages/reports/ReportsPage.tsx:import { apiJson } from '../../services/api';
zephix-frontend/src/pages/reports/ReportsPage.tsx:      const response = await apiJson('/reports', {
zephix-frontend/src/pages/reports/ReportsPage.tsx:      const response = await apiJson(`/reports/${reportId}/generate`, {
zephix-frontend/src/pages/reports/ReportsPage.tsx:      const response = await apiJson(`/reports/${reportId}/download`, {
zephix-frontend/src/services/resourceService.ts:import { apiClient } from './auth.interceptor';
zephix-frontend/src/services/resourceService.ts:    const response = await apiClient.get('/resources');
zephix-frontend/src/services/resourceService.ts:    const response = await apiClient.get(`/resources/${resourceId}/timeline`, {
zephix-frontend/src/services/resourceService.ts:    const response = await apiClient.post('/resources/check-conflicts', {
zephix-frontend/src/services/resourceService.ts:    const response = await apiClient.post('/resources/allocations', allocation);
zephix-frontend/src/services/taskService.ts:import { apiClient } from './auth.interceptor';
zephix-frontend/src/services/taskService.ts:    const response = await apiClient.get(`/tasks/project/${projectId}`);
zephix-frontend/src/services/taskService.ts:    const response = await apiClient.get(`/tasks/${taskId}`);
zephix-frontend/src/services/taskService.ts:    const response = await apiClient.post('/tasks', task);
zephix-frontend/src/services/taskService.ts:    const response = await apiClient.patch(`/tasks/${taskId}`, updates);
zephix-frontend/src/services/taskService.ts:    await apiClient.delete(`/tasks/${taskId}`);
zephix-frontend/src/services/taskService.ts:    const response = await apiClient.patch(`/tasks/${taskId}/progress`, { progress });
zephix-frontend/src/services/taskService.ts:    const response = await apiClient.get(`/projects/${projectId}/phases`);
zephix-frontend/src/services/api.ts:export const apiClient = {
zephix-frontend/src/services/api.ts:export const apiJson = async (url: string, options: any = {}) => {
zephix-frontend/src/services/enterpriseAuth.service.ts:import { authApi } from './api';
zephix-frontend/src/services/enterpriseAuth.service.ts:      const response = await authApi.login(credentials);
zephix-frontend/src/services/enterpriseAuth.service.ts:      const response = await authApi.register(userData);
zephix-frontend/src/services/enterpriseAuth.service.ts:      await authApi.logout();
zephix-frontend/src/services/workflowService.ts:import { apiJson } from './api';
zephix-frontend/src/services/workflowService.ts:    return apiJson(endpoint, options);
zephix-frontend/src/services/workflowService.ts:    return apiJson(endpoint, options);
zephix-frontend/src/services/auth.interceptor.ts:export const apiClient = authInterceptor.getApi();
zephix-frontend/src/services/auth.interceptor.ts:export default apiClient;
