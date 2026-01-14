import {
  IsArray,
  IsString,
  IsEnum,
  ArrayMinSize,
  IsEmail,
} from 'class-validator';

/**
 * PROMPT 7: Invite Members by Email DTO
 */
export class InviteMembersEmailDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  emails!: string[];

  @IsEnum(['Member', 'Guest'])
  accessLevel!: 'Member' | 'Guest';
}
