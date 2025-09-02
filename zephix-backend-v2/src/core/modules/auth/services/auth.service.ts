import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private userOrgRepository: Repository<UserOrganization>,
    private jwtService: JwtService,
  ) {}

  async signup(email: string, password: string, firstName: string, lastName: string, organizationName: string) {
    const existingUser = await this.userRepository.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const org = this.organizationRepository.create({
      name: organizationName,
      slug: organizationName.toLowerCase().replace(/\s+/g, '-'),
    });
    const savedOrg = await this.organizationRepository.save(org);

    const user = this.userRepository.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      organizationId: savedOrg.id,
      role: 'admin',
    });
    const savedUser = await this.userRepository.save(user);

    const userOrg = this.userOrgRepository.create({
      userId: savedUser.id,
      organizationId: savedOrg.id,
      role: 'owner',
    });
    await this.userOrgRepository.save(userOrg);

    return this.generateTokens(savedUser);
  }

  async login(email: string, password: string) {
    const user = await this.userRepository.findOne({ 
      where: { email: email.toLowerCase() } 
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    return this.generateTokens(user);
  }

  async refreshToken(token: string) {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token, isRevoked: false },
      relations: ['user'],
    });

    if (!refreshToken || refreshToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    refreshToken.isRevoked = true;
    await this.refreshTokenRepository.save(refreshToken);

    return this.generateTokens(refreshToken.user);
  }

  async validateUser(userId: string) {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const refreshTokenEntity = this.refreshTokenRepository.create({
      token: refreshToken,
      user,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
      },
    };
  }
}
