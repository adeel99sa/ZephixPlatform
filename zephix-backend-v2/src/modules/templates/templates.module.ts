import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { Template } from './entities/template.entity';
import { TemplatePhase } from './entities/template-phase.entity';
import { KpiDefinition } from './entities/kpi-definition.entity';
import { OrganizationMandatoryKpi } from './entities/organization-mandatory-kpi.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Template,
      TemplatePhase,
      KpiDefinition,
      OrganizationMandatoryKpi,
    ]),
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
