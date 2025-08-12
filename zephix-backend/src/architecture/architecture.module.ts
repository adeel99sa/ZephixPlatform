import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// AccessControlModule removed - using built-in NestJS guards instead
import { ArchitectureDerivationService } from './architecture-derivation.service';
import { ArchitectureController } from './architecture.controller';

@Module({
  imports: [
    // AccessControlModule removed - using built-in NestJS guards instead
    TypeOrmModule.forFeature([]),
  ],
  controllers: [ArchitectureController],
  providers: [ArchitectureDerivationService],
  exports: [ArchitectureDerivationService],
})
export class ArchitectureModule {}
