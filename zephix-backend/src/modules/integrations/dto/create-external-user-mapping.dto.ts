import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsUUID,
} from 'class-validator';

export class CreateExternalUserMappingDto {
  @IsEnum(['jira'])
  @IsNotEmpty()
  externalSystem!: 'jira';

  @IsEmail()
  @IsNotEmpty()
  externalEmail!: string;

  @IsOptional()
  @IsString()
  externalUserId?: string;

  @IsUUID()
  @IsNotEmpty()
  resourceId!: string;
}
