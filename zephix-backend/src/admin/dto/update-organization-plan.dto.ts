import { IsIn, IsString, MinLength } from 'class-validator';

/**
 * A6 — body for PATCH /admin/organizations/:id/plan.
 *
 * The `reason` field is mandatory and must be substantive (>= 10 chars).
 * Plan changes carry billing + entitlement consequences, so the audit
 * trail must record *why* the change was made, not just *that* it was.
 */
export class UpdateOrganizationPlanDto {
  @IsIn(['free', 'team', 'enterprise'], {
    message: 'planCode must be one of: free, team, enterprise',
  })
  planCode: string;

  @IsString()
  @MinLength(10, {
    message: 'Reason must be at least 10 characters — document why.',
  })
  reason: string;
}
