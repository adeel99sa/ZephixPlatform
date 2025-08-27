// File: zephix-backend/src/waitlist/waitlist.service.ts
import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Waitlist } from './entities/waitlist.entity';
import { CreateWaitlistDto } from './dto/create-waitlist.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectRepository(Waitlist)
    private waitlistRepository: Repository<Waitlist>,
    private emailService: EmailService,
  ) {}

  async create(createWaitlistDto: CreateWaitlistDto): Promise<{ success: boolean; message: string; position?: number }> {
    // Validate work email
    const freeEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
    const emailDomain = createWaitlistDto.email.split('@')[1];
    
    if (freeEmailDomains.includes(emailDomain)) {
      throw new BadRequestException('Please use a work email address');
    }

    // Check if email already exists
    const existing = await this.waitlistRepository.findOne({
      where: { email: createWaitlistDto.email }
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
      status: 'pending'
    });

    await this.waitlistRepository.save(entry);

    // Get position in waitlist
    const position = await this.waitlistRepository.count({
      where: { status: 'pending' }
    });

    // Send welcome email
    await this.emailService.sendWaitlistWelcome(entry.email, entry.name, position);

    return {
      success: true,
      message: 'Successfully joined the waitlist!',
      position
    };
  }

  async getAll(): Promise<Waitlist[]> {
    return this.waitlistRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async getStats() {
    const total = await this.waitlistRepository.count();
    const pending = await this.waitlistRepository.count({ where: { status: 'pending' } });
    const approved = await this.waitlistRepository.count({ where: { status: 'approved' } });
    const invited = await this.waitlistRepository.count({ where: { status: 'invited' } });

    const recentSignups = await this.waitlistRepository.find({
      order: { createdAt: 'DESC' },
      take: 10
    });

    return {
      total,
      pending,
      approved,
      invited,
      recentSignups
    };
  }

  async export() {
    const entries = await this.waitlistRepository.find({
      order: { createdAt: 'ASC' }
    });

    // Convert to CSV format
    const headers = ['Name', 'Email', 'Company', 'Biggest Challenge', 'Status', 'Signed Up'];
    const rows = entries.map(e => [
      e.name,
      e.email,
      e.company || '',
      e.biggestChallenge || '',
      e.status,
      e.createdAt.toISOString()
    ]);

    return {
      headers,
      rows,
      csv: [headers, ...rows].map(row => row.join(',')).join('\n')
    };
  }
}
