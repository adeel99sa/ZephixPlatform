/**
 * AUTH-MISMATCH-2 — org-signup now sets users.organization_id in one transaction.
 *
 * Verifies the fix at the source: the created user carries organizationId = the
 * new org's id (so login()'s createLoginResult no longer 400s
 * USER_MISSING_ORGANIZATION), and the org is created before the user (org-first)
 * inside a single dataSource.transaction.
 */
import { OrganizationSignupService } from './organization-signup.service';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';

const ORG_ID = '00000000-0000-0000-0000-0000000000aa';
const USER_ID = '00000000-0000-0000-0000-0000000000bb';

describe('OrganizationSignupService — AUTH-MISMATCH-2 (org-id at signup)', () => {
  let service: OrganizationSignupService;
  let userRepo: any;
  let orgRepo: any;
  let uoRepo: any;
  let dataSource: any;
  let savedEntities: any[];

  beforeEach(() => {
    savedEntities = [];
    userRepo = { findOne: jest.fn().mockResolvedValue(null) };
    orgRepo = { findOne: jest.fn().mockResolvedValue(null) };
    uoRepo = {};

    // Mock manager: create() echoes the entity tagged with its type; save()
    // assigns a deterministic id per entity kind and records call order.
    const manager = {
      create: jest.fn((type: any, data: any) => ({ __type: type, ...data })),
      save: jest.fn(async (entity: any) => {
        savedEntities.push(entity);
        if (entity.__type === Organization) return { ...entity, id: ORG_ID };
        if (entity.__type === User) return { ...entity, id: USER_ID };
        return { ...entity, id: 'uo-1' };
      }),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(manager)),
    };

    const jwt = { sign: jest.fn().mockReturnValue('jwt.token.here') };

    service = new OrganizationSignupService(
      userRepo,
      orgRepo,
      uoRepo,
      jwt as any,
      dataSource,
      undefined,
    );
  });

  const dto = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    password: 'CorrectHorse1!',
    organizationName: 'Analytical Engines',
  } as any;

  it('creates the user with organizationId set to the new org, org-first, in a transaction', async () => {
    const res = await service.signupWithOrganization(dto);

    // Ran inside a single transaction.
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);

    // Org saved before user (org-first).
    const types = savedEntities.map((e) => e.__type);
    expect(types.indexOf(Organization)).toBeLessThan(types.indexOf(User));

    // The user carries organizationId = the org id — the AM-2 fix.
    const savedUser = savedEntities.find((e) => e.__type === User);
    expect(savedUser.organizationId).toBe(ORG_ID);
    expect(savedUser.password).not.toMatch(/^\$argon2/); // AM-1: bcrypt, not argon2

    // The join-link is also written (owner).
    const link = savedEntities.find((e) => e.__type === UserOrganization);
    expect(link).toMatchObject({ userId: USER_ID, organizationId: ORG_ID, role: 'owner' });

    // Response echoes the created org + user.
    expect(res.organization.id).toBe(ORG_ID);
    expect(res.user.id).toBe(USER_ID);
  });

  it('surfaces the DB as unavailable when no dataSource is wired', async () => {
    const noDs = new OrganizationSignupService(
      userRepo,
      orgRepo,
      uoRepo,
      { sign: jest.fn() } as any,
      undefined,
      undefined,
    );
    await expect(noDs.signupWithOrganization(dto)).rejects.toThrow(
      /temporarily unavailable/i,
    );
  });
});
