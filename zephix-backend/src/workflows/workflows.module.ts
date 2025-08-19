import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowTemplate } from './entities/workflow-template.entity';
import { WorkflowStage } from './entities/workflow-stage.entity';
import { WorkflowApproval } from './entities/workflow-approval.entity';
import { WorkflowVersion } from './entities/workflow-version.entity';
import { WorkflowTemplatesController } from './controllers/workflow-templates.controller';
import { WorkflowTemplatesService } from './services/workflow-templates.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      WorkflowTemplate,
      WorkflowStage,
      WorkflowApproval,
      WorkflowVersion,
    ]),
  ],
  controllers: [
    WorkflowTemplatesController,
  ],
  providers: [
    WorkflowTemplatesService,
  ],
  exports: [
    WorkflowTemplatesService,
  ],
})
export class WorkflowsModule {}
