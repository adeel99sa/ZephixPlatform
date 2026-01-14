/**
 * Team visibility levels
 * Controls who can see and access a team
 */
export enum TeamVisibility {
  WORKSPACE = 'WORKSPACE', // Visible within assigned workspace only
  ORG = 'ORG', // Visible to all organization members
  PRIVATE = 'PRIVATE', // Only team members can see
}
