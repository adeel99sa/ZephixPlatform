import { Injectable } from '@nestjs/common';

@Injectable()
export class AuditService {
  async log(action: string, userId: string, details: any) {
    console.log(`Audit: ${action} by ${userId}`, details);
  }
}
