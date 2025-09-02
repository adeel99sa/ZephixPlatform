import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIInteraction } from './entities/ai-interaction.entity';
import { AITokenUsage } from './entities/ai-token-usage.entity';
import { AIAssistantService } from './services/ai-assistant.service';
import { AIAssistantController } from './controllers/ai-assistant.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AIInteraction, AITokenUsage])],
  controllers: [AIAssistantController],
  providers: [AIAssistantService],
  exports: [AIAssistantService],
})
export class AIAssistantModule {}
