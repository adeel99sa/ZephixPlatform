import { IsUUID, IsNotEmpty } from 'class-validator';

export class ChangeOwnerDto {
  @IsUUID()
  @IsNotEmpty()
  newOwnerId: string;
}
