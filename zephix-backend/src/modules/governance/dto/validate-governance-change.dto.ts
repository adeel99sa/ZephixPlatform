export class ValidateGovernanceChangeDto {
  changeType?: string;
  action?: string;
  component?: string;
  payload?: Record<string, unknown>;
}
