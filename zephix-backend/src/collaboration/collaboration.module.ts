import { Module } from '@nestjs/common';
// import { CollaborationGateway } from './collaboration.gateway';
import { CollaborationService } from './collaboration.service';
import { UserPresenceService } from './user-presence.service';
import { CommentService } from './comment.service';
import { ActivityFeedService } from './activity-feed.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { UserPresence } from './entities/user-presence.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, ActivityLog, UserPresence]),
  ],
  providers: [
    // CollaborationGateway,
    CollaborationService,
    UserPresenceService,
    CommentService,
    ActivityFeedService,
  ],
  exports: [
    CollaborationService,
    UserPresenceService,
    CommentService,
    ActivityFeedService,
  ],
})
export class CollaborationModule {}
