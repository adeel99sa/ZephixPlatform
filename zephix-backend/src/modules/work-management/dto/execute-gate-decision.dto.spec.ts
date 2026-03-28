import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ExecuteGateDecisionDto,
  GateConditionPayloadItemDto,
} from './project-governance.dto';
import { GateDecisionType } from '../enums/gate-decision-type.enum';

describe('ExecuteGateDecisionDto', () => {
  it('rejects CONDITIONAL_GO without nextPhaseId', async () => {
    const dto = plainToInstance(ExecuteGateDecisionDto, {
      decision: GateDecisionType.CONDITIONAL_GO,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects CONDITIONAL_GO without conditions[]', async () => {
    const dto = plainToInstance(ExecuteGateDecisionDto, {
      decision: GateDecisionType.CONDITIONAL_GO,
      nextPhaseId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts GO without nextPhaseId', async () => {
    const dto = plainToInstance(ExecuteGateDecisionDto, {
      decision: GateDecisionType.GO,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('accepts CONDITIONAL_GO with nextPhaseId and conditions', async () => {
    const dto = plainToInstance(ExecuteGateDecisionDto, {
      decision: GateDecisionType.CONDITIONAL_GO,
      nextPhaseId: '550e8400-e29b-41d4-a716-446655440000',
      conditions: [{ label: 'Provide signed charter' }],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('accepts RECYCLE with no extra fields', async () => {
    const dto = plainToInstance(ExecuteGateDecisionDto, {
      decision: GateDecisionType.RECYCLE,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});

describe('GateConditionPayloadItemDto', () => {
  it('requires label', async () => {
    const dto = plainToInstance(GateConditionPayloadItemDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
