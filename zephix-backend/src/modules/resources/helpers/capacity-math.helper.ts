import { UnitsType } from '../enums/units-type.enum';
import { Resource } from '../entities/resource.entity';
import { ResourceAllocation } from '../entities/resource-allocation.entity';

/**
 * Helper for capacity math normalization.
 * All allocations are normalized to percent-of-week capacity for rollups and conflict detection.
 *
 * Single source of truth for capacity calculations.
 */
export class CapacityMathHelper {
  /**
   * Default capacity hours per week (used when resource.capacityHoursPerWeek is missing)
   */
  static readonly DEFAULT_CAPACITY_HOURS_PER_WEEK = 40;

  /**
   * Convert allocation to percent-of-week capacity.
   *
   * Single source of truth function for all capacity math.
   *
   * For PERCENT unitsType: returns allocationPercentage directly.
   * For HOURS unitsType: converts using hoursPerWeek (or hoursPerDay * 5) and resource capacity.
   *
   * @param allocation - Allocation entity (for reading stored allocations)
   * @param resource - Resource entity (for capacityHoursPerWeek)
   * @param hoursPerWeek - Hours per week (for HOURS units when creating, optional for reading)
   * @param hoursPerDay - Hours per day (for HOURS units when creating, optional for reading)
   * @returns Percent of weekly capacity, rounded to 2 decimals
   */
  static toPercentOfWeek(
    allocation: ResourceAllocation,
    resource?: Resource | null,
    hoursPerWeek?: number | null,
    hoursPerDay?: number | null,
  ): number {
    const unitsType = allocation.unitsType;

    if (unitsType === UnitsType.PERCENT) {
      if (
        allocation.allocationPercentage === null ||
        allocation.allocationPercentage === undefined
      ) {
        throw new Error(
          'allocationPercentage is required for PERCENT unitsType',
        );
      }
      return Math.round(allocation.allocationPercentage * 100) / 100;
    }

    if (unitsType === UnitsType.HOURS) {
      // When reading from DB, allocationPercentage is already converted, so use it directly
      // When creating, we have hoursPerWeek or hoursPerDay from DTO
      let hours: number;

      if (hoursPerWeek !== null && hoursPerWeek !== undefined) {
        hours = hoursPerWeek;
      } else if (hoursPerDay !== null && hoursPerDay !== undefined) {
        hours = hoursPerDay * 5; // Assume 5 days/week
      } else if (
        allocation.allocationPercentage !== null &&
        allocation.allocationPercentage !== undefined
      ) {
        // Already converted and stored - use it directly
        return Math.round(allocation.allocationPercentage * 100) / 100;
      } else {
        throw new Error(
          'hoursPerWeek, hoursPerDay, or allocationPercentage is required for HOURS unitsType',
        );
      }

      const capacityHoursPerWeek =
        resource?.capacityHoursPerWeek || this.DEFAULT_CAPACITY_HOURS_PER_WEEK;

      // Convert: percent = (hoursPerWeek / capacityHoursPerWeek) * 100
      const percent = (hours / capacityHoursPerWeek) * 100;
      return Math.round(percent * 100) / 100; // Round to 2 decimals
    }

    throw new Error(`Unknown unitsType: ${unitsType}`);
  }

  /**
   * Get capacity hours per week for a resource (with fallback)
   */
  static getCapacityHoursPerWeek(resource?: Resource | null): number {
    return (
      resource?.capacityHoursPerWeek || this.DEFAULT_CAPACITY_HOURS_PER_WEEK
    );
  }
}
