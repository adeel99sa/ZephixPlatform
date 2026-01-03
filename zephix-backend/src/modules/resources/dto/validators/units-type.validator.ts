import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { UnitsType } from '../../enums/units-type.enum';

@ValidatorConstraint({ name: 'unitsTypeValidation', async: false })
export class UnitsTypeValidator implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const obj = args.object as any;
    const unitsType = obj.unitsType;

    // If unitsType is not set, allow (will be defaulted to PERCENT)
    if (!unitsType) {
      return true;
    }

    if (unitsType === UnitsType.HOURS) {
      // For HOURS, require at least one of hoursPerWeek or hoursPerDay
      const hasHoursPerWeek =
        obj.hoursPerWeek !== null &&
        obj.hoursPerWeek !== undefined &&
        !isNaN(obj.hoursPerWeek);
      const hasHoursPerDay =
        obj.hoursPerDay !== null &&
        obj.hoursPerDay !== undefined &&
        !isNaN(obj.hoursPerDay);

      if (!hasHoursPerWeek && !hasHoursPerDay) {
        return false;
      }

      // For HOURS, forbid allocationPercentage
      if (
        obj.allocationPercentage !== null &&
        obj.allocationPercentage !== undefined
      ) {
        return false;
      }
    } else if (unitsType === UnitsType.PERCENT) {
      // For PERCENT, require allocationPercentage
      if (
        obj.allocationPercentage === null ||
        obj.allocationPercentage === undefined ||
        isNaN(obj.allocationPercentage)
      ) {
        return false;
      }

      // For PERCENT, forbid hoursPerWeek and hoursPerDay
      if (
        (obj.hoursPerWeek !== null && obj.hoursPerWeek !== undefined) ||
        (obj.hoursPerDay !== null && obj.hoursPerDay !== undefined)
      ) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const obj = args.object as any;
    const unitsType = obj.unitsType;

    if (unitsType === UnitsType.HOURS) {
      if (
        (obj.hoursPerWeek === null || obj.hoursPerWeek === undefined) &&
        (obj.hoursPerDay === null || obj.hoursPerDay === undefined)
      ) {
        return 'hoursPerWeek or hoursPerDay is required when unitsType is HOURS';
      }
      if (
        obj.allocationPercentage !== null &&
        obj.allocationPercentage !== undefined
      ) {
        return 'allocationPercentage is not allowed when unitsType is HOURS';
      }
    } else if (unitsType === UnitsType.PERCENT) {
      if (
        obj.allocationPercentage === null ||
        obj.allocationPercentage === undefined
      ) {
        return 'allocationPercentage is required when unitsType is PERCENT';
      }
      if (
        (obj.hoursPerWeek !== null && obj.hoursPerWeek !== undefined) ||
        (obj.hoursPerDay !== null && obj.hoursPerDay !== undefined)
      ) {
        return 'hoursPerWeek and hoursPerDay are not allowed when unitsType is PERCENT';
      }
    }

    return 'Invalid unitsType validation';
  }
}

