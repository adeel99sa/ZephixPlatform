import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';

/**
 * RequireEmailVerifiedGuard
 *
 * Option B: Allow login but gate privileged actions until email is verified.
 *
 * Blocks:
 * - Creating integrations
 * - Creating invites
 * - Exporting data
 * - Admin actions
 *
 * Allows:
 * - Login
 * - /auth/me
 * - Resend verification
 * - Verify email
 */
@Injectable()
export class RequireEmailVerifiedGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const { userId } = getAuthContext(request);

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'emailVerifiedAt', 'isEmailVerified'],
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (!user.emailVerifiedAt && !user.isEmailVerified) {
      throw new ForbiddenException(
        'Please verify your email address before performing this action. Check your inbox for the verification link.',
      );
    }

    return true;
  }
}
