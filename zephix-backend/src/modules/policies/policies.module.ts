import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PolicyDefinition } from './entities/policy-definition.entity';
import { PolicyOverride } from './entities/policy-override.entity';
import { PoliciesService } from './services/policies.service';

@Module({
  imports: [TypeOrmModule.forFeature([PolicyDefinition, PolicyOverride])],
  providers: [PoliciesService],
  exports: [PoliciesService],
})
export class PoliciesModule {}
