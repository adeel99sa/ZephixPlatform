import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectBudgetEntity } from './entities/project-budget.entity';
import { ProjectBudgetsService } from './services/project-budgets.service';
import { ProjectBudgetsController } from './controllers/project-budgets.controller';
// KpiQueueModule is @Global() — DomainEventEmitterService available without import

@Module({
  imports: [TypeOrmModule.forFeature([ProjectBudgetEntity])],
  providers: [ProjectBudgetsService],
  controllers: [ProjectBudgetsController],
  exports: [ProjectBudgetsService],
})
export class BudgetsModule {}
