import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'work_item_sequences' })
@Index(['workspaceId'], { unique: true })
export class WorkItemSequence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  workspaceId!: string;

  @Column({ type: 'int', default: 0 })
  nextNumber!: number;

  @UpdateDateColumn()
  updatedAt!: Date;
}
