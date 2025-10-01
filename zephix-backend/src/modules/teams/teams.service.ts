import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
  ) {}

  async findByWorkspace(workspaceId: string): Promise<Team[]> {
    return this.teamRepository.find({
      where: { workspaceId },
      relations: ['members', 'members.user'],
    });
  }

  async findByOrganization(organizationId: string): Promise<Team[]> {
    return this.teamRepository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.members', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .where('team.organizationId = :organizationId', { organizationId })
      .andWhere('(user.organizationId = :organizationId OR user.organizationId IS NULL)', { organizationId })
      .getMany();
  }

  async create(createTeamDto: CreateTeamDto): Promise<Team> {
    const team = this.teamRepository.create(createTeamDto);
    return this.teamRepository.save(team);
  }

  async findOne(id: string, organizationId?: string): Promise<Team> {
    const queryBuilder = this.teamRepository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.members', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .where('team.id = :id', { id });

    if (organizationId) {
      queryBuilder
        .andWhere('team.organizationId = :organizationId', { organizationId })
        .andWhere('(user.organizationId = :organizationId OR user.organizationId IS NULL)', { organizationId });
    }

    return queryBuilder.getOne();
  }

  async update(id: string, updateData: Partial<Team>): Promise<Team> {
    await this.teamRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.teamRepository.delete(id);
  }
}
