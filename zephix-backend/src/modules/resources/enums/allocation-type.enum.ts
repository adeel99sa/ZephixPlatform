/**
 * Allocation Type Enum
 * Defines the commitment level of a resource allocation
 *
 * HARD: Committed allocation - resource is fully committed to this project
 * SOFT: Tentative allocation - allocation is planned but not yet committed
 * GHOST: Scenario allocation - used for planning scenarios and what-if analysis
 */
export enum AllocationType {
  HARD = 'HARD',
  SOFT = 'SOFT',
  GHOST = 'GHOST',
}
