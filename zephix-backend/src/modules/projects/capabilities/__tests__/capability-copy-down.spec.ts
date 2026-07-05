// MIRRORS templates-instantiate-v51.service.ts:~592 (project.capabilities = template.capabilities ?? {})
// — this helper does NOT self-enforce; if the production copy changes, update this or the test lies.
// End-to-end proof = GATE C staging smoke (instantiate template-with-capabilities → project carries them).
function applyCapabilitiesCopyDown(
  templateCapabilities: Record<string, unknown>,
): Record<string, unknown> {
  return { ...(templateCapabilities ?? {}) };
}

describe('AD-016 capabilities copy-down — mapping contract', () => {
  it('copies use_iterations:true verbatim from template to project', () => {
    const result = applyCapabilitiesCopyDown({ use_iterations: true });
    expect(result.use_iterations).toBe(true);
  });

  it('copies use_iterations:false verbatim — does not silently upgrade', () => {
    const result = applyCapabilitiesCopyDown({ use_iterations: false });
    expect(result.use_iterations).toBe(false);
  });

  it('copies all four canonical keys verbatim', () => {
    const template = {
      use_phases: false,
      use_iterations: true,
      use_gates: false,
      use_wip_limits: true,
    };
    const result = applyCapabilitiesCopyDown(template);
    expect(result).toEqual(template);
  });

  it('empty template capabilities → empty project capabilities (no defaults injected during copy)', () => {
    const result = applyCapabilitiesCopyDown({});
    expect(result).toEqual({});
  });

  it('undefined template capabilities → empty object (nullish coalesce in copy)', () => {
    // mirrors: template.capabilities ?? {}
    const nullish: Record<string, unknown> | undefined = undefined;
    const result = applyCapabilitiesCopyDown(nullish ?? {});
    expect(result).toEqual({});
  });

  it('snapshot is a shallow copy — mutation of result does not affect source', () => {
    const source = { use_iterations: true };
    const result = applyCapabilitiesCopyDown(source);
    result.use_iterations = false;
    expect(source.use_iterations).toBe(true);
  });
});
