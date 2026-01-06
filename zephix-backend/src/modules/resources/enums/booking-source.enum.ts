/**
 * Booking Source Enum
 * Defines the origin of a resource allocation booking
 *
 * MANUAL: Allocation created manually by a user
 * JIRA: Allocation synced from Jira
 * GITHUB: Allocation synced from GitHub
 * AI: Allocation suggested or created by AI
 */
export enum BookingSource {
  MANUAL = 'MANUAL',
  JIRA = 'JIRA',
  GITHUB = 'GITHUB',
  AI = 'AI',
}

