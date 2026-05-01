import * as bcrypt from 'bcrypt';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Organization } from '../../src/organizations/entities/organization.entity';
import { UserOrganization } from '../../src/organizations/entities/user-organization.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { Workspace } from '../../src/modules/workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../../src/modules/workspaces/entities/workspace-member.entity';
import { loginUser } from '../helpers/auth-test-helpers';

export type WorkspaceMembershipRole =
  | 'workspace_owner'
  | 'delivery_owner'
  | 'workspace_member'
  | 'workspace_viewer';

export type RequiredWorkspaceRoleForMatrix =
  | 'workspace_owner'
  | 'delivery_owner'
  | 'workspace_member'
  | 'workspace_viewer';

export interface PermissionMatrixFixtures {
  orgA: Organization;
  orgB: Organization;
  workspaceA1: Workspace;
  workspaceA2: Workspace;
  workspaceB1: Workspace;
  users: {
    platformAdminA: User;
    memberNoWorkspace: User;
    ownerA1: User;
    ownerB1: User;
    deliveryOwnerA1: User;
    memberA1: User;
    viewerA1: User;
    dualOwnerA1A2: User;
  };
  tokens: {
    platformAdminA: string;
    memberNoWorkspace: string;
    ownerA1: string;
    ownerB1: string;
    deliveryOwnerA1: string;
    memberA1: string;
    viewerA1: string;
    dualOwnerA1A2: string;
  };
}

const PASSWORD = 'password123';

async function tokenFor(app: INestApplication, email: string): Promise<string> {
  const { accessToken } = await loginUser(app, email, PASSWORD);
  return accessToken;
}

/**
 * Seeds Org_A, Org_B, three workspaces, and users at every tier required by AD-027 Section 5.2.
 * Uses `loginUser` from `auth-test-helpers` — does not modify existing E2E files.
 */
export async function buildPermissionMatrixFixtures(
  app: INestApplication,
): Promise<PermissionMatrixFixtures> {
  const ds = app.get(DataSource);
  const ts = Date.now();
  const suffix = `${ts}-${Math.floor(Math.random() * 1e6)}`;

  const orgRepo = ds.getRepository(Organization);
  const userRepo = ds.getRepository(User);
  const uoRepo = ds.getRepository(UserOrganization);
  const wsRepo = ds.getRepository(Workspace);
  const wmRepo = ds.getRepository(WorkspaceMember);

  const slug = (base: string) => `${base}-${suffix}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  const orgA = await orgRepo.save(
    orgRepo.create({
      name: `AD027 Org A ${suffix}`,
      slug: slug('org-a'),
      status: 'trial',
    }),
  );
  const orgB = await orgRepo.save(
    orgRepo.create({
      name: `AD027 Org B ${suffix}`,
      slug: slug('org-b'),
      status: 'trial',
    }),
  );

  async function createUser(
    emailLocal: string,
    orgId: string,
    userRole: string,
    uoRole: 'owner' | 'admin' | 'member' | 'viewer',
  ): Promise<User> {
    const hashed = await bcrypt.hash(PASSWORD, 10);
    const u = await userRepo.save(
      userRepo.create({
        email: `${emailLocal}-${suffix}@ad027-matrix.test`,
        password: hashed,
        firstName: emailLocal,
        lastName: 'Matrix',
        organizationId: orgId,
        role: userRole,
        isActive: true,
        isEmailVerified: true,
      }),
    );
    await uoRepo.save(
      uoRepo.create({
        userId: u.id,
        organizationId: orgId,
        role: uoRole,
        isActive: true,
        joinedAt: new Date(),
      }),
    );
    return u;
  }

  const platformAdminA = await createUser('adm', orgA.id, 'admin', 'admin');
  const memberNoWorkspace = await createUser('nows', orgA.id, 'member', 'member');
  const ownerA1 = await createUser('owna1', orgA.id, 'member', 'member');
  const dualOwnerA1A2 = await createUser('dual', orgA.id, 'member', 'member');
  const deliveryOwnerA1 = await createUser('deliv', orgA.id, 'member', 'member');
  const memberA1 = await createUser('mem', orgA.id, 'member', 'member');
  const viewerA1 = await createUser('view', orgA.id, 'member', 'viewer');
  const ownerB1 = await createUser('ownb1', orgB.id, 'member', 'member');

  const workspaceA1 = await wsRepo.save(
    wsRepo.create({
      name: `Workspace A1 ${suffix}`,
      slug: slug('ws-a1'),
      organizationId: orgA.id,
      createdBy: ownerA1.id,
      ownerId: ownerA1.id,
      isPrivate: false,
    }),
  );
  const workspaceA2 = await wsRepo.save(
    wsRepo.create({
      name: `Workspace A2 ${suffix}`,
      slug: slug('ws-a2'),
      organizationId: orgA.id,
      createdBy: dualOwnerA1A2.id,
      ownerId: dualOwnerA1A2.id,
      isPrivate: false,
    }),
  );
  const workspaceB1 = await wsRepo.save(
    wsRepo.create({
      name: `Workspace B1 ${suffix}`,
      slug: slug('ws-b1'),
      organizationId: orgB.id,
      createdBy: ownerB1.id,
      ownerId: ownerB1.id,
      isPrivate: false,
    }),
  );

  async function addMember(
    organizationId: string,
    workspaceId: string,
    userId: string,
    role: WorkspaceMembershipRole,
    createdBy: string,
  ): Promise<void> {
    await wmRepo.save(
      wmRepo.create({
        organizationId,
        workspaceId,
        userId,
        role,
        createdBy,
      }),
    );
  }

  await addMember(orgA.id, workspaceA1.id, ownerA1.id, 'workspace_owner', ownerA1.id);
  await addMember(orgA.id, workspaceA1.id, dualOwnerA1A2.id, 'workspace_owner', ownerA1.id);
  await addMember(orgA.id, workspaceA2.id, dualOwnerA1A2.id, 'workspace_owner', dualOwnerA1A2.id);
  await addMember(orgB.id, workspaceB1.id, ownerB1.id, 'workspace_owner', ownerB1.id);

  await addMember(orgA.id, workspaceA1.id, deliveryOwnerA1.id, 'delivery_owner', ownerA1.id);
  await addMember(orgA.id, workspaceA1.id, memberA1.id, 'workspace_member', ownerA1.id);
  await addMember(orgA.id, workspaceA1.id, viewerA1.id, 'workspace_viewer', ownerA1.id);

  const users = {
    platformAdminA,
    memberNoWorkspace,
    ownerA1,
    ownerB1,
    deliveryOwnerA1,
    memberA1,
    viewerA1,
    dualOwnerA1A2,
  };

  const tokens = {
    platformAdminA: await tokenFor(app, platformAdminA.email),
    memberNoWorkspace: await tokenFor(app, memberNoWorkspace.email),
    ownerA1: await tokenFor(app, ownerA1.email),
    ownerB1: await tokenFor(app, ownerB1.email),
    deliveryOwnerA1: await tokenFor(app, deliveryOwnerA1.email),
    memberA1: await tokenFor(app, memberA1.email),
    viewerA1: await tokenFor(app, viewerA1.email),
    dualOwnerA1A2: await tokenFor(app, dualOwnerA1A2.email),
  };

  return {
    orgA,
    orgB,
    workspaceA1,
    workspaceA2,
    workspaceB1,
    users,
    tokens,
  };
}

/** Workspace-role ladder: higher index = stronger (approximate for matrix Test 2). */
const ROLE_LADDER: RequiredWorkspaceRoleForMatrix[] = [
  'workspace_viewer',
  'workspace_member',
  'delivery_owner',
  'workspace_owner',
];

export function tierBelow(
  required: RequiredWorkspaceRoleForMatrix,
): RequiredWorkspaceRoleForMatrix | null {
  const idx = ROLE_LADDER.indexOf(required);
  if (idx <= 0) return null;
  return ROLE_LADDER[idx - 1]!;
}

/** Map abstract tier to which fixture token key to use for requests against workspace A1 */
export function tokenKeyForWorkspaceTier(
  tier: RequiredWorkspaceRoleForMatrix,
): keyof PermissionMatrixFixtures['tokens'] {
  switch (tier) {
    case 'workspace_owner':
      return 'ownerA1';
    case 'delivery_owner':
      return 'deliveryOwnerA1';
    case 'workspace_member':
      return 'memberA1';
    case 'workspace_viewer':
      return 'viewerA1';
    default:
      return 'viewerA1';
  }
}
