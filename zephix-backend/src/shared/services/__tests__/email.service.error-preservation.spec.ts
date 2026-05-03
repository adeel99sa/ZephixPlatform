/**
 * Verifies that SendGrid errors are preserved in the thrown error message,
 * not swallowed into a generic "Failed to send email" string.
 *
 * Context: 118 failed outbox rows on staging all show "Failed to send email"
 * with no diagnostic info. This test ensures the real SendGrid error (status
 * code + message) reaches the outbox error_message column.
 */

const mockSend = jest.fn();
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: (...args: unknown[]) => mockSend(...args),
}));

import { EmailService } from '../email.service';

describe('EmailService error preservation', () => {
  let service: EmailService;

  beforeAll(() => {
    process.env.SENDGRID_API_KEY = 'SG.test-key';
    service = new EmailService();
  });

  afterAll(() => {
    delete process.env.SENDGRID_API_KEY;
  });

  beforeEach(() => {
    mockSend.mockReset();
  });

  it('preserves real SendGrid error message in thrown error', async () => {
    mockSend.mockRejectedValueOnce({
      code: 403,
      message: 'Sender identity not verified',
    });

    await expect(
      service.sendEmail({
        to: 'test@example.com',
        from: 'noreply@zephix.dev',
        subject: 'Test',
        html: '<p>test</p>',
      }),
    ).rejects.toThrow('Failed to send email: 403 — Sender identity not verified');
  });

  it('includes response statusCode when code is missing', async () => {
    mockSend.mockRejectedValueOnce({
      response: { statusCode: 401 },
      message: 'API key invalid',
    });

    await expect(
      service.sendEmail({
        to: 'test@example.com',
        from: 'noreply@zephix.dev',
        subject: 'Test',
        html: '<p>test</p>',
      }),
    ).rejects.toThrow('Failed to send email: 401 — API key invalid');
  });

  it('handles unknown error shape gracefully', async () => {
    mockSend.mockRejectedValueOnce(new Error('Network timeout'));

    await expect(
      service.sendEmail({
        to: 'test@example.com',
        from: 'noreply@zephix.dev',
        subject: 'Test',
        html: '<p>test</p>',
      }),
    ).rejects.toThrow('Failed to send email: unknown — Network timeout');
  });
});
