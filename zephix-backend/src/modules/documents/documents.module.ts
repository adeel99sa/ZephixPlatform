import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from './entities/document.entity';
import { DocumentsService } from './services/documents.service';
import { DocumentsController } from './controllers/documents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity])],
  providers: [DocumentsService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
