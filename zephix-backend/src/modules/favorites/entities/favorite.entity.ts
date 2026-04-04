import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export type FavoriteItemType = 'workspace' | 'project' | 'dashboard';

@Entity('favorites')
@Unique('UQ_favorites_user_item', ['userId', 'itemType', 'itemId'])
@Index('IDX_favorites_user_id', ['userId'])
@Index('IDX_favorites_user_org', ['userId', 'organizationId'])
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'item_type', type: 'varchar', length: 50 })
  itemType: FavoriteItemType;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
