import { ApiProperty } from '@nestjs/swagger';

export class TeamMemberResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };

  @ApiProperty({ enum: ['admin', 'member', 'viewer'] })
  role: 'admin' | 'member' | 'viewer';

  @ApiProperty({ enum: ['active', 'pending', 'inactive'] })
  status: 'active' | 'pending' | 'inactive';

  @ApiProperty()
  joinedAt: Date;
}

export class InvitationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: ['admin', 'member', 'viewer'] })
  role: 'admin' | 'member' | 'viewer';

  @ApiProperty({ enum: ['pending', 'accepted', 'expired', 'cancelled'] })
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';

  @ApiProperty({ required: false })
  message?: string;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  invitedBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };

  @ApiProperty()
  createdAt: Date;
}
