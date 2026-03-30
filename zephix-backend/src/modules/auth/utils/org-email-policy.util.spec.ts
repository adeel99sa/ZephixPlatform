import {
  extractEmailDomain,
  isEmailAllowedForOrganization,
  resolveOrganizationAllowedEmailDomain,
} from './org-email-policy.util';
import { Organization } from '../../../organizations/entities/organization.entity';

function makeOrganization(partial: Partial<Organization>): Organization {
  return {
    id: 'org-1',
    name: 'Meta',
    slug: 'meta',
    status: 'active',
    website: null as unknown as string,
    industry: null as unknown as string,
    size: null as unknown as string,
    description: null as unknown as string,
    trialEndsAt: null as unknown as Date,
    planCode: 'enterprise',
    planStatus: 'active',
    planExpiresAt: null,
    planMetadata: null,
    settings: {},
    internalManaged: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    userOrganizations: [],
    users: [],
    projects: [],
    isActive: () => true,
    ...partial,
  };
}

describe('org-email-policy.util', () => {
  it('extracts normalized email domain', () => {
    expect(extractEmailDomain('User@Meta.COM')).toBe('meta.com');
    expect(extractEmailDomain('invalid-email')).toBeNull();
  });

  it('resolves domain from organization identity settings first', () => {
    const organization = makeOrganization({
      settings: {
        identity: {
          allowedEmailDomain: 'meta.com',
        },
      },
      website: 'https://ignored.example.com',
    });

    expect(resolveOrganizationAllowedEmailDomain(organization)).toBe('meta.com');
  });

  it('falls back to website domain when identity setting is missing', () => {
    const organization = makeOrganization({
      settings: {},
      website: 'https://www.meta.com',
    });

    expect(resolveOrganizationAllowedEmailDomain(organization)).toBe('meta.com');
  });

  it('allows only exact domain match', () => {
    const organization = makeOrganization({
      settings: { identity: { allowedEmailDomain: 'meta.com' } },
    });

    expect(isEmailAllowedForOrganization('dev@meta.com', organization)).toBe(true);
    expect(isEmailAllowedForOrganization('dev@other.com', organization)).toBe(false);
    expect(isEmailAllowedForOrganization('dev@sub.meta.com', organization)).toBe(
      false,
    );
  });
});

