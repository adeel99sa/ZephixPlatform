import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('userDailyCapacity')
export class UserDailyCapacity {
  @PrimaryColumn({ name: 'organizationId' })
  organizationId: string;

  @PrimaryColumn({ name: 'userId' })
  userId: string;

  @PrimaryColumn({ name: 'capacityDate', type: 'date' })
  capacityDate: Date;

  @Column({ name: 'allocatedPercentage', default: 0 })
  allocatedPercentage: number;
}
