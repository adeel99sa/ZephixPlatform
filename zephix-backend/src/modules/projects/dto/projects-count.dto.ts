import { Expose } from 'class-transformer';

export class ProjectsCountDto {
  @Expose()
  count!: number;
}
