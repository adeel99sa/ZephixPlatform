import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  async sendEmail(to: string, subject: string, body: string) {
    console.log(`Email sent to ${to}: ${subject}`);
    return true;
  }
}
