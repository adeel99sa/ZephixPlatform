import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  WorkspaceComplexityMode,
  WORKSPACE_COMPLEXITY_MODE_B2_VALUES,
  type WorkspaceComplexityModeB2,
} from '../entities/workspace.entity';

/**
 * B2 — request body for `PATCH /api/v1/workspaces/:id/complexity-mode`.
 *
 * Validation accepts only the B2 vocabulary (lean | standard | governed).
 * Legacy values (simple, advanced) are still tolerated on read paths until
 * the Stage 3 enum cleanup (PR3) — see ADR-B2-001 — but are rejected here.
 */
export class UpdateComplexityModeDto {
  @ApiProperty({
    description:
      'Workspace complexity tier. Org Admin only (ADR-B2-004). ' +
      'Determines governance enforcement and Programs availability.',
    enum: WORKSPACE_COMPLEXITY_MODE_B2_VALUES,
    example: WorkspaceComplexityMode.STANDARD,
  })
  @IsIn(WORKSPACE_COMPLEXITY_MODE_B2_VALUES, {
    message:
      'mode must be one of: lean, standard, governed. Legacy values (simple, advanced) are not accepted on writes.',
  })
  mode!: WorkspaceComplexityModeB2;
}

/**
 * B2 — response body for `GET /api/v1/workspaces/:id/complexity-mode` and
 * `PATCH /api/v1/workspaces/:id/complexity-mode`.
 *
 * On read, `mode` may transiently include legacy values during the
 * Stage 1→Stage 2 backfill window. Frontend should treat any unrecognized
 * value as `lean` (safest default).
 *
 * Shape locked to Stream B's `UpdateWorkspaceComplexityModeDto` in
 * `zephix-frontend/src/features/workspaces/workspace.api.ts:70-74`:
 *   { mode, updatedAt, updatedBy?: string }
 *
 * `updatedBy` is the actor user ID (UUID string), not a nested
 * `{ id, email }` object. The B2 PR1 review verdict described the
 * latter shape, but Stream B's actual merged code expects a string
 * — aligning to the merged contract. If richer actor info is needed
 * later, add a separate `updatedByEmail?: string` field rather than
 * changing `updatedBy` shape.
 */
export class ComplexityModeResponseDto {
  @ApiProperty({
    description: 'Current workspace complexity tier.',
    enum: [
      ...WORKSPACE_COMPLEXITY_MODE_B2_VALUES,
      WorkspaceComplexityMode.SIMPLE,
      WorkspaceComplexityMode.ADVANCED,
    ],
    example: WorkspaceComplexityMode.STANDARD,
  })
  mode!: WorkspaceComplexityMode;

  @ApiProperty({
    description: 'ISO timestamp of the last persisted update to this field.',
    required: false,
    nullable: true,
    example: '2026-05-09T12:00:00.000Z',
  })
  updatedAt?: string | null;

  @ApiProperty({
    description:
      'User ID of the actor who last changed the mode. Populated on PATCH responses.',
    required: false,
    nullable: true,
    example: '750d0c15-60ba-47c2-bebc-3f2834c23ec5',
  })
  updatedBy?: string | null;
}
