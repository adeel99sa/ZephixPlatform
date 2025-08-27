// File: zephix-backend/src/waitlist/entities/waitlist.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('waitlist')
@Index(['email'], { unique: true })
export class Waitlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ type: 'text', nullable: true })
  biggestChallenge: string;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  source: string; // Where they signed up from

  @Column({ default: 'pending' })
  status: string; // pending, approved, invited, rejected

  @Column({ nullable: true })
  invitedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
