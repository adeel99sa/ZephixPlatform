import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Workspace } from '../entities/workspace.entity';

@Injectable()
export class WorkspacesService {
  constructor(@InjectRepository(Workspace) private readonly repo: Repository<Workspace>) {}

  findAllByOrg(organizationId: string) {
    return this.repo.find({ where: { organizationId, deletedAt: IsNull() } });
  }

  findOne(id: string, organizationId: string) {
    return this.repo.findOne({ where: { id, organizationId, deletedAt: IsNull() } });
  }
}
