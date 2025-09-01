import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserOrganization } from './user-organization.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ default: 'trial' })
  status: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  industry: string;

  @Column({ nullable: true })
  size: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  trialEndsAt: Date;

  @Column({ type: 'jsonb', default: {} })
  settings: object;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => UserOrganization, userOrg => userOrg.organization)
  userOrganizations: UserOrganization[];

  // Methods
  isActive(): boolean {
    return this.status === 'active' || this.status === 'trial';
  }
}