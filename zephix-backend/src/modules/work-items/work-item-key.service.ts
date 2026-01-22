import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkItemSequence } from './entities/work-item-sequence.entity';

@Injectable()
export class WorkItemKeyService {
  constructor(
    @InjectRepository(WorkItemSequence)
    private readonly seqRepo: Repository<WorkItemSequence>,
  ) {}

  async nextKey(workspaceId: string, prefix = 'ZPX'): Promise<string> {
    const seq = await this.seqRepo.findOne({ where: { workspaceId } });

    if (!seq) {
      const created = this.seqRepo.create({ workspaceId, nextNumber: 1 });
      await this.seqRepo.save(created);
      return `${prefix}-000001`;
    }

    const next = seq.nextNumber + 1;
    await this.seqRepo.update({ id: seq.id }, { nextNumber: next });

    const padded = String(next).padStart(6, '0');
    return `${prefix}-${padded}`;
  }
}
