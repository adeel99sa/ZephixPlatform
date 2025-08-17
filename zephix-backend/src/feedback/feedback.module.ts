import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackService } from './services/feedback.service';
import { FeedbackController } from './controllers/feedback.controller';
import { Feedback } from './entities/feedback.entity';

@Module({
  imports: [
    // Only import TypeORM when database is available
    ...(process.env.SKIP_DATABASE !== 'true'
      ? [TypeOrmModule.forFeature([Feedback])]
      : []),
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
