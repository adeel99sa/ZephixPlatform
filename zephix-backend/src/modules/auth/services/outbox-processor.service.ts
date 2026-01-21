import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthOutbox } from '../entities/auth-outbox.entity';
import { EmailService } from '../../../shared/services/email.service';

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS = [5 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000]; // 5min, 30min, 2h

@Injectable()
export class OutboxProcessorService {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private isProcessing = false;
  private isDisabled = false; // Disable if table missing
  private hasLoggedDisabled = false; // Track if we've logged the disabled message

  constructor(
    @InjectRepository(AuthOutbox)
    private outboxRepository: Repository<AuthOutbox>,
    private emailService: EmailService,
  ) {
    // Log once on boot if worker is disabled
    if (process.env.OUTBOX_PROCESSOR_ENABLED !== 'true') {
      this.logger.log(
        'OutboxProcessorService disabled: OUTBOX_PROCESSOR_ENABLED is not set to "true"',
      );
      this.hasLoggedDisabled = true;
    }
  }

  /**
   * Process outbox events every minute
   *
   * Uses SKIP LOCKED for safe multi-replica processing.
   * Each replica claims rows exclusively, preventing duplicates.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processOutbox(): Promise<void> {
    // Skip in test mode
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // Gate: Only run if explicitly enabled
    if (process.env.OUTBOX_PROCESSOR_ENABLED !== 'true') {
      if (!this.hasLoggedDisabled) {
        this.logger.log(
          'OutboxProcessorService disabled: OUTBOX_PROCESSOR_ENABLED is not set to "true"',
        );
        this.hasLoggedDisabled = true;
      }
      return;
    }

    if (this.isProcessing) {
      return; // Prevent concurrent processing within same instance
    }

    if (this.isDisabled) {
      return; // Disabled due to missing table
    }

    this.isProcessing = true;

    try {
      const now = new Date();

      // Claim rows using SKIP LOCKED (safe for multiple replicas)
      // This query uses FOR UPDATE SKIP LOCKED to claim rows exclusively
      const queryRunner =
        this.outboxRepository.manager.connection.createQueryRunner();

      try {
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          // Claim pending events ready for processing
          const claimedEvents = await queryRunner.query(
            `
            SELECT id FROM auth_outbox
            WHERE status = 'pending'
              AND (next_attempt_at IS NULL OR next_attempt_at <= $1)
            ORDER BY created_at ASC
            LIMIT 25
            FOR UPDATE SKIP LOCKED
            `,
            [now],
          );

          // Also claim failed events ready for retry
          const retryEvents = await queryRunner.query(
            `
            SELECT id FROM auth_outbox
            WHERE status = 'failed'
              AND next_attempt_at <= $1
              AND attempts < $2
            ORDER BY created_at ASC
            LIMIT 25
            FOR UPDATE SKIP LOCKED
            `,
            [now, MAX_ATTEMPTS],
          );

          const allEventIds = [
            ...claimedEvents.map((e: any) => e.id),
            ...retryEvents.map((e: any) => e.id),
          ];

          if (allEventIds.length === 0) {
            await queryRunner.commitTransaction();
            return;
          }

          // Mark as processing with claim timestamp
          await queryRunner.query(
            `
            UPDATE auth_outbox
            SET status = 'processing',
                processing_started_at = $1,
                claimed_at = $1
            WHERE id = ANY($2::uuid[])
            `,
            [now, allEventIds],
          );

          await queryRunner.commitTransaction();

          // Load full events and process them
          const events = await this.outboxRepository.find({
            where: { id: In(allEventIds) },
          });

          for (const event of events) {
            await this.processEvent(event);
          }
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw error;
        } finally {
          await queryRunner.release();
        }
      } catch (error: any) {
        // Check if table is missing - disable processor and log once
        if (
          error?.message?.includes('relation "auth_outbox" does not exist') ||
          error?.message?.includes('does not exist')
        ) {
          if (!this.isDisabled) {
            this.isDisabled = true;
            this.logger.error(
              '❌ OutboxProcessorService DISABLED: auth_outbox table does not exist. Run migrations before enabling.',
            );
            this.logger.error(
              '   Run: npm run migration:run or use Railway one-time command',
            );
          }
          return; // Stop processing until migrations run
        }
        this.logger.error('Error processing outbox', error);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single outbox event
   */
  private async processEvent(event: AuthOutbox): Promise<void> {
    try {
      // Mark as processing - only if still in pending/processing state (race protection)
      const updateResult = await this.outboxRepository.update(
        { id: event.id, status: In(['pending', 'processing']) },
        {
          status: 'processing',
        },
      );

      // If no rows updated, another replica already processed it
      if (updateResult.affected === 0) {
        this.logger.warn(
          `Outbox event ${event.id} was already processed by another replica`,
        );
        return;
      }

      // Process based on event type
      switch (event.type) {
        case 'auth.email_verification.requested':
          await this.handleEmailVerificationRequested(event);
          break;
        case 'auth.invite.created':
          await this.handleInviteCreated(event);
          break;
        default:
          this.logger.warn(`Unknown event type: ${event.type}`);
          await this.outboxRepository.update(
            { id: event.id, status: 'processing' },
            {
              status: 'failed',
              errorMessage: `Unknown event type: ${event.type}`,
            },
          );
          return;
      }

      // Mark as completed (sent) - only if still in processing state (race protection)
      const completeResult = await this.outboxRepository.update(
        { id: event.id, status: 'processing' },
        {
          status: 'completed',
          processedAt: new Date(),
          sentAt: new Date(),
        },
      );

      if (completeResult.affected === 0) {
        this.logger.warn(
          `Outbox event ${event.id} status changed during processing`,
        );
        return;
      }

      this.logger.log(`Processed outbox event: ${event.type} (${event.id})`);
    } catch (error: any) {
      const attempts = event.attempts + 1;
      const nextAttemptAt =
        attempts < MAX_ATTEMPTS
          ? new Date(
              Date.now() + RETRY_DELAYS[attempts - 1] ||
                RETRY_DELAYS[RETRY_DELAYS.length - 1],
            )
          : null;

      // Update with status check - only if still in processing state (race protection)
      await this.outboxRepository.update(
        { id: event.id, status: 'processing' },
        {
          status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
          attempts,
          nextAttemptAt,
          lastError: error.message || 'Unknown error',
          errorMessage: error.message || 'Unknown error',
        },
      );

      this.logger.error(
        `Failed to process outbox event: ${event.type} (${event.id}), attempt ${attempts}`,
        error,
      );
    }
  }

  /**
   * Handle email verification requested event
   */
  private async handleEmailVerificationRequested(
    event: AuthOutbox,
  ): Promise<void> {
    const { email, token, fullName } = event.payloadJson;

    await this.emailService.sendVerificationEmail(email, token);
  }

  /**
   * Handle invite created event
   */
  private async handleInviteCreated(event: AuthOutbox): Promise<void> {
    const { email, token, orgName, role, message, expiresAt } =
      event.payloadJson;

    // Build invitation link
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invites/accept?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invitation to ${orgName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table align="center" width="600" style="margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #5850EC 0%, #6366F1 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: white; font-size: 28px;">You're Invited!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #1F2937;">Join ${orgName}</h2>
              <p style="margin: 0 0 30px; color: #4B5563; font-size: 16px;">
                You've been invited to join <strong>${orgName}</strong> as a <strong>${role}</strong>.
              </p>
              ${message ? `<p style="margin: 0 0 30px; color: #4B5563; font-size: 16px;">${message}</p>` : ''}
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 6px; background: #5850EC;">
                    <a href="${invitationLink}" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: white; text-decoration: none;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 10px; color: #6B7280; font-size: 14px;">
                Or copy this link: ${invitationLink}
              </p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                This invitation expires on ${new Date(expiresAt).toLocaleDateString()}. If you didn't expect this invitation, please ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await this.emailService.sendEmail({
      to: email,
      subject: `Invitation to join ${orgName}`,
      html,
      text: `You've been invited to join ${orgName} as a ${role}. Accept here: ${invitationLink}`,
    });
  }
}
