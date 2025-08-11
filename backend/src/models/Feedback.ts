import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
  BeforeCreate,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { User } from './User';
import { Organization } from './Organization';

export enum FeedbackType {
  BUG = 'bug',
  ENHANCEMENT = 'enhancement',
  QUESTION = 'question',
  COMPLAINT = 'complaint',
  PRAISE = 'praise',
}

export enum FeedbackPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum FeedbackStatus {
  NEW = 'new',
  IN_REVIEW = 'in_review',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  WONT_FIX = 'wont_fix',
}

@Table({
  tableName: 'feedbacks',
  timestamps: true,
})
export class Feedback extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(FeedbackType)),
    allowNull: false,
  })
  type!: FeedbackType;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(FeedbackPriority)),
    allowNull: false,
    defaultValue: FeedbackPriority.MEDIUM,
  })
  priority!: FeedbackPriority;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(FeedbackStatus)),
    allowNull: false,
    defaultValue: FeedbackStatus.NEW,
  })
  status!: FeedbackStatus;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  title!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  description!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  screenshotUrl?: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  metadata?: {
    page?: string;
    feature?: string;
    userAgent?: string;
    viewport?: {
      width: number;
      height: number;
    };
    sessionId?: string;
    errorStack?: string;
    userJourney?: Array<{
      page: string;
      action: string;
      timestamp: Date;
    }>;
    systemInfo?: {
      browser: string;
      os: string;
      device: string;
    };
  };

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5,
    },
  })
  rating?: number;

  @ForeignKey(() => User)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId!: string;

  @ForeignKey(() => Organization)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  organizationId!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  assignedTo?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  resolvedAt?: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  resolution?: string;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    defaultValue: [],
  })
  tags!: string[];

  // Associations
  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => Organization)
  organization!: Organization;

  // Hooks
  @BeforeCreate
  static generateId(instance: Feedback) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }
}