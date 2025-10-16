import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';

@Controller()
export class ProbesController {
  @Get('debug-ping')
  ping() {
    return { success: true, data: { ok: true, ts: new Date().toISOString() } };
  }

  @UseGuards(JwtAuthGuard)
  @Get('auth-debug')
  auth(@Req() req: any) {
    return { success: true, data: { ok: true, user: req.user, ts: new Date().toISOString() } };
  }
}
