import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserOrganization } from './user-organization.entity';

@Entity('organizations')
@Index('IDX_ORGANIZATION_SLUG', ['slug'])
@Index('IDX_ORGANIZATION_STATUS', ['status'])
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ unique: true, length: 100 })
  slug: string;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ['active', 'suspended', 'trial'],
    default: 'active',
  })
  status: 'active' | 'suspended' | 'trial';

  @Column({ type: 'date', nullable: true })
  trialEndsAt: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  industry: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => UserOrganization, (userOrg) => userOrg.organization, {
    cascade: true,
  })
  userOrganizations: UserOrganization[];

  // Helper methods
  isActive(): boolean {
    return this.status === 'active';
  }

  isTrial(): boolean {
    return this.status === 'trial';
  }

  isTrialExpired(): boolean {
    if (!this.isTrial() || !this.trialEndsAt) return false;
    return new Date() > this.trialEndsAt;
  }
}
