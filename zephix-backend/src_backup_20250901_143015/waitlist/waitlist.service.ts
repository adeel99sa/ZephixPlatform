// File: zephix-backend/src/waitlist/waitlist.service.ts
import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Waitlist } from './entities/waitlist.entity';
import { CreateWaitlistDto } from './dto/create-waitlist.dto';
import { EmailService } from '../shared/services/email.service';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectRepository(Waitlist)
    private waitlistRepository: Repository<Waitlist>,
    private emailService: EmailService,
  ) {}

  async create(
    createWaitlistDto: CreateWaitlistDto,
  ): Promise<{ success: boolean; message: string; position?: number }> {
    const freeEmailDomains = [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'aol.com',
    ];
    const emailDomain = createWaitlistDto.email.split('@')[1];

    if (freeEmailDomains.includes(emailDomain)) {
      throw new BadRequestException('Please use a work email address');
    }

    // Check if email already exists
    const existing = await this.waitlistRepository.findOne({
      where: { email: createWaitlistDto.email },
    });

    if (existing) {
      throw new ConflictException('This email is already on the waitlist');
    }

    // Extract company from email if not provided
    const company = createWaitlistDto.company || emailDomain.split('.')[0];

    // Create waitlist entry
    const entry = this.waitlistRepository.create({
      ...createWaitlistDto,
      company,
      emailVerified: false,
      status: 'pending',
    });

    await this.waitlistRepository.save(entry);

    // Get position in waitlist
    const position = await this.waitlistRepository.count({
      where: { status: 'pending' },
    });

    // ENTERPRISE UPDATE: Send welcome email only if SMTP is configured
    try {
      await this.emailService.sendWaitlistWelcome(
        entry.email,
        entry.name,
        position,
      );
      console.log(`Welcome email sent to ${entry.email}`);
    } catch (error) {
      console.warn(`Email send failed for ${entry.email}:`, error.message);
      // Don't fail the signup - email is optional
    }

    return {
      success: true,
      message: 'Successfully joined the waitlist!',
      position,
    };
  }

  async getAll(): Promise<Waitlist[]> {
    return this.waitlistRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    invited: number;
    rejected: number;
  }> {
    const [total, pending, approved, invited, rejected] = await Promise.all([
      this.waitlistRepository.count(),
      this.waitlistRepository.count({ where: { status: 'pending' } }),
      this.waitlistRepository.count({ where: { status: 'approved' } }),
      this.waitlistRepository.count({ where: { status: 'invited' } }),
      this.waitlistRepository.count({ where: { status: 'rejected' } }),
    ]);

    return { total, pending, approved, invited, rejected };
  }

  async export(): Promise<{ csv: string }> {
    const entries = await this.waitlistRepository.find({
      order: { createdAt: 'ASC' },
    });

    const headers = [
      'Name',
      'Email',
      'Company',
      'Biggest Challenge',
      'Status',
      'Created At',
    ];
    const csvRows = [headers.join(',')];

    entries.forEach((entry) => {
      const row = [
        `"${entry.name}"`,
        `"${entry.email}"`,
        `"${entry.company || ''}"`,
        `"${entry.biggestChallenge || ''}"`,
        `"${entry.status}"`,
        `"${entry.createdAt.toISOString()}"`,
      ];
      csvRows.push(row.join(','));
    });

    return { csv: csvRows.join('\n') };
  }
}
