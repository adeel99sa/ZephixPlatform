/**
 * DTO shape-validation tests for the relaxed status field (WM-A2b).
 *
 * Convention (from WM-A2b discovery): status/enum work must trace the full
 * request path — controller → DTO → guard → service. These tests own the
 * DTO layer: custom keys pass, empty strings die here with a clean message,
 * not at the service with UNRECOGNIZED_STATUS.
 *
 * Two DTOs, two assertions each (custom key ✓, empty string ✗).
 */
import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateWorkTaskDto } from '../update-work-task.dto';
import { BulkStatusUpdateDto } from '../bulk-status-update.dto';

// ── UpdateWorkTaskDto ──────────────────────────────────────────────────────────

describe('UpdateWorkTaskDto — status field shape validation', () => {
  it('custom status key passes DTO validation (UAT_SIGNED_OFF)', async () => {
    const dto = plainToInstance(UpdateWorkTaskDto, { status: 'UAT_SIGNED_OFF' });
    const errors = await validate(dto);
    const statusErrors = errors.filter((e) => e.property === 'status');
    expect(statusErrors).toHaveLength(0);
  });

  it('empty string is rejected at DTO level (isNotEmpty constraint)', async () => {
    const dto = plainToInstance(UpdateWorkTaskDto, { status: '' });
    const errors = await validate(dto);
    const statusErrors = errors.filter((e) => e.property === 'status');
    expect(statusErrors.length).toBeGreaterThan(0);
    const constraints = statusErrors.flatMap((e) => Object.keys(e.constraints ?? {}));
    expect(constraints).toContain('isNotEmpty');
  });
});

// ── BulkStatusUpdateDto ────────────────────────────────────────────────────────

describe('BulkStatusUpdateDto — status field shape validation', () => {
  it('custom status key passes DTO validation (UAT_SIGNED_OFF)', async () => {
    const dto = plainToInstance(BulkStatusUpdateDto, {
      taskIds: ['00000000-0000-0000-0000-000000000001'],
      status: 'UAT_SIGNED_OFF',
    });
    const errors = await validate(dto);
    const statusErrors = errors.filter((e) => e.property === 'status');
    expect(statusErrors).toHaveLength(0);
  });

  it('empty string is rejected at DTO level (isNotEmpty constraint)', async () => {
    const dto = plainToInstance(BulkStatusUpdateDto, {
      taskIds: ['00000000-0000-0000-0000-000000000001'],
      status: '',
    });
    const errors = await validate(dto);
    const statusErrors = errors.filter((e) => e.property === 'status');
    expect(statusErrors.length).toBeGreaterThan(0);
    const constraints = statusErrors.flatMap((e) => Object.keys(e.constraints ?? {}));
    expect(constraints).toContain('isNotEmpty');
  });
});
