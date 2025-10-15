import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';

@Controller()
export class DebugController {
  @Get('debug-ping')
  ping() {
    const ts = new Date().toISOString();
    return { success: true, data: { ok: true, name: 'debug-ping', ts }, page: 1, timestamp: ts };
  }

  @UseGuards(JwtAuthGuard)
  @Get('auth-debug')
  authDebug(@Req() req: any) {
    const ts = new Date().toISOString();
    return {
      success: true,
      data: { ok: true, user: req.user ?? null, authHeader: !!req.headers?.authorization, ts },
      page: 1,
      timestamp: ts,
    };
  }
}
