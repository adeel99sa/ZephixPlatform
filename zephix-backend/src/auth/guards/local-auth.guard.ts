import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Local Authentication Guard
 * 
 * This guard validates username/password credentials for login endpoints.
 * Used specifically for the login route to validate credentials.
 * 
 * @example
 * @UseGuards(LocalAuthGuard)
 * @Post('login')
 * async login(@Request() req) {
 *   return this.authService.login(req.user);
 * }
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {} 