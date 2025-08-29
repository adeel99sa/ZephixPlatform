import { Module } from '@nestjs/common';
import { DiagnosticController } from './diagnostic.controller';

@Module({
  controllers: [DiagnosticController]
})
export class DiagnosticModule {}
