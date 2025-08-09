import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BRD } from './entities/brd.entity';
import { BRDController } from './controllers/brd.controller';
import { BRDService } from './services/brd.service';
import { BRDRepository } from './repositories/brd.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([BRD]),
  ],
  controllers: [BRDController],
  providers: [
    BRDService,
    BRDRepository,
  ],
  exports: [
    BRDService,
    BRDRepository,
  ],
})
export class BRDModule {}