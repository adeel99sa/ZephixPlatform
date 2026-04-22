import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { DASHBOARD_CARD_DEFINITIONS } from '../dashboard-card-definition';

const CARD_KEYS = DASHBOARD_CARD_DEFINITIONS.map((item) => item.cardKey);

export class DashboardCardMutationDto {
  @ApiProperty({ enum: CARD_KEYS })
  @IsString()
  @IsIn(CARD_KEYS)
  cardKey: string;
}

