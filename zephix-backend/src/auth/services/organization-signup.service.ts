import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { OrganizationSignupDto } from '../dto/organization-signup.dto';
import { JwtService } from '@nestjs/jwt';

export interface OrganizationSignupResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
  access_token: string;
}

@Injectable()
export class OrganizationSignupService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
    private jwtService: JwtService,
  ) {}

  async signupWithOrganization(
    signupDto: OrganizationSignupDto,
  ): Promise<OrganizationSignupResponse> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: signupDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Generate organization slug if not provided
    let slug = signupDto.organizationSlug;
    if (!slug) {
      slug = this.generateSlug(signupDto.organizationName);
    }

    // Check if organization slug already exists
    const existingOrg = await this.organizationRepository.findOne({
      where: { slug },
    });

    if (existingOrg) {
      throw new ConflictException('Organization with this slug already exists');
    }

    // Hash password
    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(signupDto.password, saltOrRounds);

    // Create user
    const user = this.userRepository.create({
      firstName: signupDto.firstName,
      lastName: signupDto.lastName,
      email: signupDto.email,
      password: hashedPassword,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    // Create organization
    const organization = this.organizationRepository.create({
      name: signupDto.organizationName,
      slug,
      status: 'trial', // Start with trial
      website: signupDto.website,
      industry: signupDto.industry,
      size: signupDto.organizationSize,
      trialEndsAt: this.calculateTrialEndDate(),
      settings: {
        timezone: 'UTC',
        currency: 'USD',
        onboardingCompleted: false,
      },
    });

    const savedOrganization =
      await this.organizationRepository.save(organization);

    // Create user-organization relationship (user becomes owner)
    const userOrganization = this.userOrganizationRepository.create({
      userId: savedUser.id,
      organizationId: savedOrganization.id,
      role: 'owner',
      isActive: true,
      joinedAt: new Date(),
    });

    await this.userOrganizationRepository.save(userOrganization);

    // Generate JWT token
    const payload = {
      sub: savedUser.id,
      email: savedUser.email,
      organizationId: savedOrganization.id,
      role: 'owner',
    };
    const access_token = this.jwtService.sign(payload);

    return {
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
      },
      organization: {
        id: savedOrganization.id,
        name: savedOrganization.name,
        slug: savedOrganization.slug,
        status: savedOrganization.status,
      },
      access_token,
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
      .substring(0, 100); // Limit length
  }

  private calculateTrialEndDate(): Date {
    const trialDays = 30; // 30-day trial
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + trialDays);
    return trialEnd;
  }

  async checkSlugAvailability(slug: string): Promise<boolean> {
    const existingOrg = await this.organizationRepository.findOne({
      where: { slug },
    });
    return !existingOrg;
  }
}
