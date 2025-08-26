import { ApiProperty } from '@nestjs/swagger';

export class AdminStatsDto {
  @ApiProperty({ description: 'Total number of users' })
  userCount: number;

  @ApiProperty({ description: 'Total number of workflow templates' })
  templateCount: number;

  @ApiProperty({ description: 'Total number of projects' })
  projectCount: number;

  @ApiProperty({ description: 'Number of active users' })
  activeUsers: number;

  @ApiProperty({ description: 'Timestamp of last activity' })
  lastActivity: string;

  @ApiProperty({ description: 'Recent activities', type: 'array' })
  recentActivities: Array<{
    id: string;
    action: string;
    timestamp: Date;
    user: {
      email: string;
      firstName: string;
      lastName: string;
    };
  }>;
}
