import { Organization } from '../../../organizations/entities/organization.entity';

type OrganizationSettingsShape = {
  identity?: {
    allowedEmailDomain?: string;
    singleOrganizationMode?: boolean;
  };
};

function normalizeDomain(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function extractEmailDomain(email: string): string | null {
  const atIndex = email.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === email.length - 1) return null;
  return normalizeDomain(email.slice(atIndex + 1));
}

function extractWebsiteDomain(website?: string | null): string | null {
  if (!website) return null;
  try {
    const parsed = new URL(website.includes('://') ? website : `https://${website}`);
    return normalizeDomain(parsed.hostname.replace(/^www\./, ''));
  } catch {
    return null;
  }
}

export function resolveOrganizationAllowedEmailDomain(
  organization: Organization,
): string | null {
  const settings = (organization.settings || {}) as OrganizationSettingsShape;
  return (
    normalizeDomain(settings.identity?.allowedEmailDomain) ||
    extractWebsiteDomain(organization.website) ||
    null
  );
}

export function isEmailAllowedForOrganization(
  email: string,
  organization: Organization,
): boolean {
  const emailDomain = extractEmailDomain(email);
  const allowedDomain = resolveOrganizationAllowedEmailDomain(organization);
  if (!emailDomain || !allowedDomain) return false;
  return emailDomain === allowedDomain;
}

