/**
 * Shared invite email validation.
 * Enforces same-company email domain rule across all invite flows:
 * onboarding, org invite, and workspace invite.
 */

/** Standard helper text for all invite surfaces */
export const INVITE_DOMAIN_HELPER = "Only people with your company email domain can be invited.";

/**
 * Extract the email domain from a user's email address.
 * Returns empty string if email is invalid.
 */
export function getEmailDomain(email: string | undefined | null): string {
  if (!email) return "";
  const parts = email.split("@");
  return parts.length === 2 ? parts[1].toLowerCase() : "";
}

/**
 * Validate a list of emails against the inviter's company domain.
 * Returns { valid, offDomain } arrays.
 */
export function validateInviteEmails(
  emails: string[],
  inviterDomain: string,
): { valid: string[]; offDomain: string[] } {
  if (!inviterDomain) return { valid: emails, offDomain: [] };

  const valid: string[] = [];
  const offDomain: string[] = [];

  for (const email of emails) {
    const domain = getEmailDomain(email);
    if (domain === inviterDomain.toLowerCase()) {
      valid.push(email);
    } else {
      offDomain.push(email);
    }
  }

  return { valid, offDomain };
}

/**
 * Build a user-facing error message for off-domain emails.
 */
export function offDomainErrorMessage(offDomain: string[], inviterDomain: string): string {
  if (offDomain.length === 1) {
    return `${offDomain[0]} is not a @${inviterDomain} email. ${INVITE_DOMAIN_HELPER}`;
  }
  return `${offDomain.length} emails are not @${inviterDomain}: ${offDomain.join(", ")}. ${INVITE_DOMAIN_HELPER}`;
}
