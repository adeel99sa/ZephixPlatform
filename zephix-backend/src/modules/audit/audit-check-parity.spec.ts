import { AuditAction, AuditEntityType } from './audit.constants';
import {
  verifyAuditEnumParity,
  KNOWN_NON_ENUM_ACTION_CHECK_VALUES,
  KNOWN_NON_ENUM_ENTITY_CHECK_VALUES,
} from './audit-check-parity';

const enumActions = Object.values(AuditAction) as string[];
const enumEntities = Object.values(AuditEntityType) as string[];

/** A CHECK set that satisfies parity: every enum value + the allowlist. */
const goodCheckActions = [...enumActions, ...KNOWN_NON_ENUM_ACTION_CHECK_VALUES];
const goodCheckEntities = [
  ...enumEntities,
  ...KNOWN_NON_ENUM_ENTITY_CHECK_VALUES,
];

describe('verifyAuditEnumParity (SEC-4 schema-parity guard)', () => {
  it('passes when CHECK = enum ∪ allowlist (the intended post-migration state)', () => {
    const r = verifyAuditEnumParity({
      checkActions: goodCheckActions,
      checkEntities: goodCheckEntities,
    });
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('DIRECTION A: fails when an enum action is missing from the CHECK (would be swallowed)', () => {
    const missing = goodCheckActions.filter(
      (a) => a !== AuditAction.PASSWORD_RESET_LINK_GENERATED,
    );
    const r = verifyAuditEnumParity({
      checkActions: missing,
      checkEntities: goodCheckEntities,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('DIRECTION A') && e.includes('password_reset_link_generated'))).toBe(true);
  });

  it('DIRECTION A: fails when an enum entity_type is missing from the CHECK', () => {
    const missing = goodCheckEntities.filter((e) => e !== AuditEntityType.TEMPLATE);
    const r = verifyAuditEnumParity({
      checkActions: goodCheckActions,
      checkEntities: missing,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('DIRECTION A') && e.includes("'template'"))).toBe(true);
  });

  it('DIRECTION B: fails on a NEW CHECK value that is neither enum nor allowlisted', () => {
    const r = verifyAuditEnumParity({
      checkActions: [...goodCheckActions, 'SOME_UNEXPLAINED_NEW_ACTION'],
      checkEntities: goodCheckEntities,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('DIRECTION B') && e.includes('SOME_UNEXPLAINED_NEW_ACTION'))).toBe(true);
  });

  it('HYGIENE: the allowlists never overlap the enums (consolidated values are removed)', () => {
    const overlapA = KNOWN_NON_ENUM_ACTION_CHECK_VALUES.filter((a) =>
      (enumActions as string[]).includes(a),
    );
    const overlapE = KNOWN_NON_ENUM_ENTITY_CHECK_VALUES.filter((e) =>
      (enumEntities as string[]).includes(e),
    );
    expect(overlapA).toEqual([]);
    expect(overlapE).toEqual([]);
  });
});
