/**
 * TC-B6 — Merge field resolver unit tests.
 *
 * Exercises the pure resolution layer per-token: the token map builder, the
 * risk→health mapping, and the recursive substitution (including the
 * unresolvable-token-stays-literal contract).
 */
import {
  buildMergeTokenMap,
  riskLevelToHealth,
  substituteMergeTokens,
  MergeResolutionInputs,
} from '../merge-field-resolver.service';

const baseInputs = (
  over: Partial<MergeResolutionInputs> = {},
): MergeResolutionInputs => ({
  projectName: 'Apollo',
  managerName: 'Ada Lovelace',
  currentPhaseName: 'Initiation',
  riskLevel: 'LOW',
  teamNames: ['Ada Lovelace', 'Alan Turing'],
  milestoneNames: ['Kickoff', 'Go-Live'],
  ...over,
});

describe('riskLevelToHealth', () => {
  it.each([
    ['LOW', 'On Track'],
    ['low', 'On Track'],
    ['MEDIUM', 'At Risk'],
    ['HIGH', 'Needs Attention'],
    ['CRITICAL', 'Needs Attention'],
  ])('maps %s → %s', (input, expected) => {
    expect(riskLevelToHealth(input)).toBe(expected);
  });

  it('returns null for null / unknown', () => {
    expect(riskLevelToHealth(null)).toBeNull();
    expect(riskLevelToHealth('WEIRD')).toBeNull();
  });
});

describe('buildMergeTokenMap (per-token)', () => {
  it('resolves {{project.name}}', () => {
    expect(buildMergeTokenMap(baseInputs())['{{project.name}}']).toBe('Apollo');
  });

  it('resolves {{project.manager}}', () => {
    expect(buildMergeTokenMap(baseInputs())['{{project.manager}}']).toBe(
      'Ada Lovelace',
    );
  });

  it('resolves {{project.phase}}', () => {
    expect(buildMergeTokenMap(baseInputs())['{{project.phase}}']).toBe(
      'Initiation',
    );
  });

  it('resolves {{project.health}} from risk level', () => {
    expect(buildMergeTokenMap(baseInputs())['{{project.health}}']).toBe(
      'On Track',
    );
  });

  it('resolves {{team}} as a comma list', () => {
    expect(buildMergeTokenMap(baseInputs())['{{team}}']).toBe(
      'Ada Lovelace, Alan Turing',
    );
  });

  it('resolves {{milestones}} as a comma list', () => {
    expect(buildMergeTokenMap(baseInputs())['{{milestones}}']).toBe(
      'Kickoff, Go-Live',
    );
  });

  it('leaves each token null when its source is missing/empty', () => {
    const map = buildMergeTokenMap(
      baseInputs({
        projectName: '   ',
        managerName: null,
        currentPhaseName: null,
        riskLevel: null,
        teamNames: [],
        milestoneNames: ['', '  '],
      }),
    );
    expect(map['{{project.name}}']).toBeNull();
    expect(map['{{project.manager}}']).toBeNull();
    expect(map['{{project.phase}}']).toBeNull();
    expect(map['{{project.health}}']).toBeNull();
    expect(map['{{team}}']).toBeNull();
    expect(map['{{milestones}}']).toBeNull();
  });
});

describe('substituteMergeTokens', () => {
  const richText = {
    format: 'rich_text',
    blocks: [
      { type: 'heading', text: 'Charter for {{project.name}}' },
      { type: 'paragraph', text: 'PM: {{project.manager}}. Health: {{project.health}}.' },
      { type: 'paragraph', text: 'Team: {{team}}' },
    ],
  };

  it('replaces resolvable tokens verbatim, deep, without mutating input', () => {
    const map = buildMergeTokenMap(baseInputs());
    const { content, unresolvedFields } = substituteMergeTokens(richText, map);

    expect(content.blocks[0].text).toBe('Charter for Apollo');
    expect(content.blocks[1].text).toBe('PM: Ada Lovelace. Health: On Track.');
    expect(content.blocks[2].text).toBe('Team: Ada Lovelace, Alan Turing');
    expect(unresolvedFields).toEqual([]);
    // input untouched
    expect(richText.blocks[0].text).toBe('Charter for {{project.name}}');
  });

  it('keeps an unresolvable token literal and reports it once', () => {
    const map = buildMergeTokenMap(baseInputs({ managerName: null }));
    const { content, unresolvedFields } = substituteMergeTokens(richText, map);

    expect(content.blocks[1].text).toBe(
      'PM: {{project.manager}}. Health: On Track.',
    );
    expect(unresolvedFields).toEqual(['{{project.manager}}']);
  });

  it('reports distinct unresolved tokens across many blocks', () => {
    const map = buildMergeTokenMap(
      baseInputs({ managerName: null, teamNames: [] }),
    );
    const { unresolvedFields } = substituteMergeTokens(richText, map);
    expect(unresolvedFields.sort()).toEqual(
      ['{{project.manager}}', '{{team}}'].sort(),
    );
  });
});
