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

  async findByWorkspace(workspaceId: string, organizationId: string): Promise<Team[]> {
    return this.teamRepository.find({
      where: { workspaceId, organizationId },
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

  async create(createTeamDto: CreateTeamDto, organizationId: string): Promise<Team> {
    const team = this.teamRepository.create({
      ...createTeamDto,
      organizationId
    });
    return this.teamRepository.save(team);
  }

  async findOne(id: string, organizationId: string): Promise<Team> {
    const queryBuilder = this.teamRepository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.members', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .where('team.id = :id', { id })
      .andWhere('team.organizationId = :organizationId', { organizationId })
      .andWhere('(user.organizationId = :organizationId OR user.organizationId IS NULL)', { organizationId });

    return queryBuilder.getOne();
  }

  async update(id: string, updateData: Partial<Team>, organizationId: string): Promise<Team> {
    const team = await this.findOne(id, organizationId);
    if (!team) {
      throw new Error('Team not found');
    }
    Object.assign(team, updateData);
    return this.teamRepository.save(team);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const team = await this.findOne(id, organizationId);
    if (!team) {
      throw new Error('Team not found');
    }
    await this.teamRepository.delete({ id, organizationId });
  }
}
