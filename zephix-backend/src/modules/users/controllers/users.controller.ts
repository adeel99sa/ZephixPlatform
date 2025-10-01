import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationValidationGuard } from '../../../guards/organization-validation.guard';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, OrganizationValidationGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {
    console.log('UsersController constructor called');
  }

  @Get()
  async findAll(@Request() req) {
    return this.usersService.findAll(req.user.organizationId);
  }

  @Get('stats')
  async getStats(@Request() req) {
    return this.usersService.getUserStats(req.user.organizationId);
  }

  @Get('test')
  test() {
    console.log('Test endpoint called');
    return { message: 'Users controller is working', timestamp: new Date().toISOString() };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post('invite')
  async inviteUser(@Request() req, @Body() inviteDto: any) {
    return this.usersService.inviteUser(inviteDto, req.user.id, req.user.organizationId);
  }

  @Post('accept-invitation')
  async acceptInvitation(@Body() body: { token: string; password: string; firstName: string; lastName: string }) {
    return this.usersService.acceptInvitation(body.token, body.password, body.firstName, body.lastName);
  }
}





