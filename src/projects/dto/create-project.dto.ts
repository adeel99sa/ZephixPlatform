import { ProjectPriority } from '../entities/project.entity';

export class CreateProjectDto {
  name: string;
  description?: string;
  currentPhase?: string;
  startDate?: Date;
  endDate?: Date;
  priority?: ProjectPriority;
}
