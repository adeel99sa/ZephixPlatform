import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { User } from '../entities/user.entity';
import { Invitation } from '../entities/invitation.entity';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
  ) {}

  async findAll(organizationId: string, page = 1, limit = 20) {
    const [users, total] = await this.userRepository.findAndCount({
      where: { organizationId },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' }
    });

    return {
      data: users,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() }
    });
  }

  async findByOrganization(organizationId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { organizationId, isActive: true },
      select: ['id', 'email', 'firstName', 'lastName', 'role'],
      order: { firstName: 'ASC' }
    });
  }

  async inviteUser(inviteDto: any, invitedBy: string, organizationId: string) {
    const existingUser = await this.findByEmail(inviteDto.email);
    if (existingUser && existingUser.organizationId === organizationId) {
      throw new ConflictException('User already exists in this organization');
    }

    const existingInvite = await this.invitationRepository.findOne({
      where: { email: inviteDto.email, organizationId, status: 'pending' }
    });
    if (existingInvite) {
      throw new ConflictException('Invitation already sent to this email');
    }

    const invitationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = this.invitationRepository.create({
      email: inviteDto.email,
      role: inviteDto.role || 'member',
      organizationId,
      invitedBy,
      token: invitationToken,
      expiresAt,
      status: 'pending'
    });

    return await this.invitationRepository.save(invitation);
  }

  async acceptInvitation(token: string, password: string, firstName: string, lastName: string) {
    const invitation = await this.invitationRepository.findOne({
      where: { token, status: 'pending' }
    });

    if (!invitation) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'expired';
      await this.invitationRepository.save(invitation);
      throw new BadRequestException('Invitation has expired');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = this.userRepository.create({
      email: invitation.email,
      password: hashedPassword,
      firstName,
      lastName,
      organizationId: invitation.organizationId,
      organizationRole: invitation.role,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date()
    });

    const savedUser = await this.userRepository.save(user);
    
    invitation.status = 'accepted';
    await this.invitationRepository.save(invitation);

    return savedUser;
  }

  async getUserStats(organizationId: string) {
    const totalUsers = await this.userRepository.count({ where: { organizationId } });
    const activeUsers = await this.userRepository.count({ where: { organizationId, isActive: true } });
    const pendingInvitations = await this.invitationRepository.count({ 
      where: { organizationId, status: 'pending' } 
    });

    return {
      totalUsers,
      activeUsers,
      pendingInvitations
    };
  }

  async countByOrganization(organizationId: string): Promise<number> {
    return this.userRepository.count({
      where: { organizationId, isActive: true }
    });
  }

  async countAdmins(organizationId: string): Promise<number> {
    return this.userRepository.count({
      where: { organizationId, isActive: true, role: 'admin' }
    });
  }
}
