import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateDocDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;
}
