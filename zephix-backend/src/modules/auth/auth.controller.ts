import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    return req.user;
  }

  @Post('logout')
  async logout(@Request() req) {
    const userId = req.user?.id;
    if (userId) {
      await this.authService.logout(userId);
    }
    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  async refreshToken(@Request() req, @Body() body: { refreshToken: string }) {
    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.refreshToken(body.refreshToken, ip, userAgent);
  }
}
