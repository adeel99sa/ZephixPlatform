import { Module } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { AuditService } from './services/audit.service';

@Module({
  providers: [EmailService, AuditService],
  exports: [EmailService, AuditService],
})
export class SharedModule {}
