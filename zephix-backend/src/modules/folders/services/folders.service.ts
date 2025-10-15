import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Folder } from '../entities/folder.entity';

@Injectable()
export class FoldersService {
  constructor(@InjectRepository(Folder) private readonly repo: Repository<Folder>) {}

  listByWorkspace(workspaceId: string) {
    return this.repo.find({ where: { workspaceId, deletedAt: IsNull() } });
  }
}
