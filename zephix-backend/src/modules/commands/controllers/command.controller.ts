import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { CommandService } from '../services/command.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';

@Controller('commands')
@UseGuards(JwtAuthGuard)
export class CommandController {
  constructor(private readonly commandService: CommandService) {}

  @Get('search')
  async search(@Query('q') query: string, @Request() req: AuthRequest) {
    const { userId, organizationId } = getAuthContext(req);
    return this.commandService.executeCommand(query, userId, organizationId);
  }
}
