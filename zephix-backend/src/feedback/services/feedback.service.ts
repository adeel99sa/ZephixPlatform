import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback, FeedbackStatus } from '../entities/feedback.entity';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { User } from '../../modules/users/entities/user.entity';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
  ) {}

  async create(
    createFeedbackDto: CreateFeedbackDto,
    user: User,
  ): Promise<Feedback> {
    const feedback = this.feedbackRepository.create({
      ...createFeedbackDto,
      user,
      status: FeedbackStatus.NEW,
    });

    const savedFeedback = await this.feedbackRepository.save(feedback);

    // Log for immediate visibility
    console.log(`🔔 NEW FEEDBACK from ${user.firstName} ${user.lastName}`);
    console.log(`📝 Type: ${createFeedbackDto.type}`);
    console.log(`💬 Content: ${createFeedbackDto.content}`);
    console.log(`📍 Context: ${createFeedbackDto.context || 'Not specified'}`);
    console.log('---');

    return savedFeedback;
  }

  async findAll(): Promise<Feedback[]> {
    return this.feedbackRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getStatistics() {
    const [total, byType, byStatus] = await Promise.all([
      this.feedbackRepository.count(),
      this.feedbackRepository
        .createQueryBuilder('feedback')
        .select('feedback.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('feedback.type')
        .getRawMany(),
      this.feedbackRepository
        .createQueryBuilder('feedback')
        .select('feedback.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('feedback.status')
        .getRawMany(),
    ]);

    return {
      total,
      byType: byType.reduce(
        (acc, item) => ({ ...acc, [item.type]: parseInt(item.count) }),
        {},
      ),
      byStatus: byStatus.reduce(
        (acc, item) => ({ ...acc, [item.status]: parseInt(item.count) }),
        {},
      ),
    };
  }
}
