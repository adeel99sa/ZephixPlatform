import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorite } from './entities/favorite.entity';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Project } from '../projects/entities/project.entity';
import { Dashboard } from '../dashboards/entities/dashboard.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Favorite, Workspace, Project, Dashboard])],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}
