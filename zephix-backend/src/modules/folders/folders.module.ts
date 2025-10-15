import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Folder } from './entities/folder.entity';
import { FoldersService } from './services/folders.service';
import { FoldersController } from './controllers/folders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Folder])],
  controllers: [FoldersController],
  providers: [FoldersService],
  exports: [FoldersService, TypeOrmModule],
})
export class FoldersModule {}
