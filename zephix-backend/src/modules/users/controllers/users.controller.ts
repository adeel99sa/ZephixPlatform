import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UsersService } from '../users.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('available')
  async getAvailableUsers(@CurrentUser() user: any) {
    return this.usersService.findByOrganization(user.organizationId);
  }
}
