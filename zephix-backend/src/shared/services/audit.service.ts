import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  logAccess(event: string, details: Record<string, any>): void {
    this.logger.log(`[ACCESS] ${event}: ${JSON.stringify(details)}`);
  }

  logAction(event: string, details: Record<string, any>): void {
    this.logger.log(`[ACTION] ${event}: ${JSON.stringify(details)}`);
  }
}


