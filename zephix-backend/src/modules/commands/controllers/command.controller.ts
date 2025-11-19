import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { CommandService } from '../services/command.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('commands')
@UseGuards(JwtAuthGuard)
export class CommandController {
  constructor(private readonly commandService: CommandService) {}

  @Get('search')
  async search(@Query('q') query: string, @Request() req) {
    return this.commandService.executeCommand(
      query,
      req.user.id,
      req.user.organizationId,
    );
  }
}
