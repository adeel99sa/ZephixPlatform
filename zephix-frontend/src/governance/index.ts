export * from "./TemplateArchitecture";
export {
  validateWorkspaceChange,
  type ChangeRequest,
  type ValidationResult,
} from "./validateWorkspaceChange";
export {
  mockFinancePolicy,
  mockEngineeringPolicy,
  resolveWorkspaceConfigFromMock,
  getLockedFieldsForPolicy,
  MOCK_BASELINE_NAMES,
} from "./mockPolicies";
export { useWorkspaceConfig } from "./useWorkspaceConfig";
