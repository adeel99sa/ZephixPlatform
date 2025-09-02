import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../auth/entities/user.entity';
import { Program } from '../../programs/entities/program.entity';

@Entity('portfolios')
export class Portfolio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ name: 'owner_id', nullable: true })
  ownerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => Program, program => program.portfolio)
  programs: Program[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
