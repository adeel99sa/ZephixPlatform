import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TEMPLATE_WORKFLOW,
  type TemplateWorkflow,
} from '../TemplateWorkflow';

describe('TemplateWorkflow contract', () => {
  it('default workflow disables automations and gates until backend exists', () => {
    expect(DEFAULT_TEMPLATE_WORKFLOW.creation.copyAutomations).toBe(false);
    expect(DEFAULT_TEMPLATE_WORKFLOW.creation.copyPhaseGates).toBe(false);
    expect(DEFAULT_TEMPLATE_WORKFLOW.execution.phaseGateRules).toEqual([]);
  });

  it('satisfies TemplateWorkflow shape', () => {
    const w: TemplateWorkflow = DEFAULT_TEMPLATE_WORKFLOW;
    expect(w.creation.copyStructure).toBe(true);
  });
});
