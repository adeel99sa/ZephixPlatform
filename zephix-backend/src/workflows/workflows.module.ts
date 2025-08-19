import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { 
  WorkflowTemplate,
  WorkflowStage,
  WorkflowApproval,
  WorkflowVersion 
} from './entities';
import { 
  WorkflowTemplatesService,
  AdvancedWorkflowOrchestrationService 
} from './services';
import { WorkflowTemplatesController } from './controllers/workflow-templates.controller';

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
  controllers: [WorkflowTemplatesController],
  providers: [
    WorkflowTemplatesService,
    AdvancedWorkflowOrchestrationService,
  ],
  exports: [
    WorkflowTemplatesService,
    AdvancedWorkflowOrchestrationService,
  ],
})
export class WorkflowsModule {}
