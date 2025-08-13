import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ example: 'uuid-refresh-token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
