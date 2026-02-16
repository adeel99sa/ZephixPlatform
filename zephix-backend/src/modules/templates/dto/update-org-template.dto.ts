import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsIn,
} from 'class-validator';
import {
  VALID_DELIVERY_METHODS,
  VALID_TAB_IDS,
} from '../constants/template-defaults';

/**
 * Wave 6: DTO for updating an org-owned template.
 * All fields optional — only provided fields are updated.
 * Tab IDs and delivery methods validated against shared constants.
 */
export class UpdateOrgTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn([...VALID_DELIVERY_METHODS], {
    message: `deliveryMethod must be one of: ${VALID_DELIVERY_METHODS.join(', ')}`,
  })
  deliveryMethod?: string;

  @IsOptional()
  @IsArray()
  @IsIn([...VALID_TAB_IDS], {
    each: true,
    message: 'Each tab must be a valid tab ID',
  })
  defaultTabs?: string[];

  @IsOptional()
  @IsObject()
  defaultGovernanceFlags?: Record<string, boolean>;
}
