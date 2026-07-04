import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetAttributeValueDto {
  @ApiProperty({
    description:
      'Value to store. JS type must match the definition dataType ' +
      '(string → text/long_text/url/email/single_select/file_reference/date/datetime, ' +
      'number → number/integer/decimal/currency/percentage/rating/duration, ' +
      'boolean → boolean, array/object → multi_select/people/relationship/computed). ' +
      'Wrong primitive → 400 ATTRIBUTE_TYPE_MISMATCH.',
  })
  @IsNotEmpty()
  value!: unknown;
}
