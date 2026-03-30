export class CreateGovernancePolicyDto {
  name: string;
  scope?: string;
  config?: Record<string, unknown>;
}
