import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Resource } from '../../resources/entities/resource.entity';
import { Organization } from '../../../organizations/entities/organization.entity';

@Entity('external_user_mappings')
@Index(['organizationId', 'externalSystem', 'externalEmail'], { unique: true })
export class ExternalUserMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'external_system', type: 'varchar', length: 50 })
  externalSystem: 'jira' | 'linear' | 'github';

  @Column({ name: 'external_email', type: 'varchar', length: 255 })
  externalEmail: string;

  @Column({
    name: 'external_user_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  externalUserId?: string;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Resource)
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
