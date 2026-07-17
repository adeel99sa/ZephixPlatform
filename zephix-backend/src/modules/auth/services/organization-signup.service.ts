import {
  Injectable,
  ConflictException,
  BadRequestException,
  ServiceUnavailableException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { OrganizationSignupDto } from '../dto/organization-signup.dto';
import { JwtService } from '@nestjs/jwt';
import { OrgProvisioningService } from './org-provisioning.service';

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
  private readonly isEmergencyMode: boolean;

  constructor(
    @Optional()
    @InjectRepository(User)
    private userRepository: Repository<User> | null,
    @Optional()
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization> | null,
    @Optional()
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization> | null,
    private jwtService: JwtService,
    @Optional()
    private readonly dataSource?: DataSource,
    @Optional()
    private readonly orgProvisioningService?: OrgProvisioningService,
  ) {
    this.isEmergencyMode = process.env.SKIP_DATABASE === 'true';

    if (this.isEmergencyMode) {
      console.log(
        '🚨 OrganizationSignupService: Emergency mode - database operations disabled',
      );
    }
  }

  async signupWithOrganization(
    signupDto: OrganizationSignupDto,
  ): Promise<OrganizationSignupResponse> {
    // EMERGENCY MODE: Return service unavailable
    if (
      this.isEmergencyMode ||
      !this.userRepository ||
      !this.organizationRepository ||
      !this.userOrganizationRepository ||
      !this.dataSource
    ) {
      throw new ServiceUnavailableException(
        'Organization signup is temporarily unavailable due to database maintenance. Please try again later.',
      );
    }

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

    // Hash password. AUTH-MISMATCH-1: bcrypt, matching AuthService.login()'s
    // verify path. This service previously used argon2.hash, but login() only
    // runs bcrypt.compare — so every user created here was locked out on their
    // next login (bcrypt.compare vs an $argon2 hash always fails, indistinguishable
    // from a wrong password). Parity here stops the minting; login()'s
    // format-aware verify rescues any argon2 hashes already in the wild.
    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    // AUTH-MISMATCH-2: org-first, single transaction. Previously this ran three
    // separate non-transactional saves (user → org → link) and NEVER set
    // user.organization_id — so login() 400'd USER_MISSING_ORGANIZATION on the
    // next login (it reads the column, not the join-link), and a mid-signup
    // failure left an orphaned user who could neither log in nor be cleanly
    // backfilled. Now: create the org, then the user WITH organizationId set,
    // then the join-link, all atomically. A partial signup rolls back to
    // nothing instead of minting an orphan.
    const { savedUser, savedOrganization } = await this.dataSource.transaction(
      async (manager) => {
        const organization = manager.create(Organization, {
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
        const org = await manager.save(organization);

        const user = manager.create(User, {
          firstName: signupDto.firstName,
          lastName: signupDto.lastName,
          email: signupDto.email,
          password: hashedPassword,
          isActive: true,
          organizationId: org.id,
        });
        const usr = await manager.save(user);

        const userOrganization = manager.create(UserOrganization, {
          userId: usr.id,
          organizationId: org.id,
          role: 'owner',
          isActive: true,
          joinedAt: new Date(),
        });
        await manager.save(userOrganization);

        return { savedUser: usr, savedOrganization: org };
      },
    );

    // Post-signup provisioning (best-effort — signup succeeds even if this fails)
    if (this.orgProvisioningService) {
      try {
        await this.orgProvisioningService.provisionNewOrganization({
          organizationId: savedOrganization.id,
          userId: savedUser.id,
          userName: savedUser.firstName || savedUser.email,
          organizationName: savedOrganization.name,
        });
      } catch {
        // Non-blocking — lazy-create fills gaps on subsequent requests
      }
    }

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
    if (this.isEmergencyMode || !this.organizationRepository) {
      return false; // In emergency mode, assume slug is not available
    }

    const existingOrg = await this.organizationRepository.findOne({
      where: { slug },
    });
    return !existingOrg;
  }
}
