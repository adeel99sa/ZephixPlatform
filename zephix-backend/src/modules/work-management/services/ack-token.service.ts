import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AckToken } from '../entities/ack-token.entity';
import { createHash, randomBytes } from 'crypto';

export interface AckTokenPayload {
  organizationId: string;
  workspaceId: string;
  projectId: string;
  userId: string;
  operationCode: string;
  targetEntityId: string;
  payloadHash: string;
  expiresInSeconds?: number; // Default 5 minutes
}

export interface AckRequiredResponse {
  code: 'ACK_REQUIRED';
  message: string;
  ack: {
    token: string;
    expiresAt: string;
    impactSummary: string;
    impactedEntities: Array<{
      type: 'PHASE' | 'TASK' | 'PROJECT';
      id: string;
      name?: string;
    }>;
  };
}

@Injectable()
export class AckTokenService {
  private readonly DEFAULT_EXPIRY_SECONDS = 300; // 5 minutes

  constructor(
    @InjectRepository(AckToken)
    private readonly ackTokenRepo: Repository<AckToken>,
  ) {}

  /**
   * Generate a new ack token
   * Token binds to org, workspace, user, project, operation, entity, and payload hash
   */
  async generateToken(payload: AckTokenPayload): Promise<string> {
    const expiresIn = payload.expiresInSeconds || this.DEFAULT_EXPIRY_SECONDS;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Generate random token
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Create token record
    const ackToken = this.ackTokenRepo.create({
      organizationId: payload.organizationId,
      workspaceId: payload.workspaceId,
      projectId: payload.projectId,
      userId: payload.userId,
      operationCode: payload.operationCode,
      targetEntityId: payload.targetEntityId,
      tokenHash,
      payloadHash: payload.payloadHash,
      expiresAt,
      usedAt: null,
    });

    await this.ackTokenRepo.save(ackToken);

    return token;
  }

  /**
   * Validate and consume a token
   * Returns true if valid and unused, throws if invalid/expired/used
   * If manager is provided, uses transaction manager; otherwise uses repository
   */
  async validateAndConsume(
    token: string,
    organizationId: string,
    workspaceId: string,
    projectId: string,
    userId: string,
    operationCode: string,
    targetEntityId: string,
    payloadHash: string,
    manager?: EntityManager,
  ): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const repo = manager ? manager.getRepository(AckToken) : this.ackTokenRepo;
    const ackToken = await repo.findOne({
      where: { tokenHash },
    });

    if (!ackToken) {
      throw new ConflictException({
        code: 'ACK_TOKEN_INVALID',
        message: 'Confirmation expired. Try again.',
      });
    }

    // Check expiry
    if (new Date() > ackToken.expiresAt) {
      throw new ConflictException({
        code: 'ACK_TOKEN_EXPIRED',
        message: 'Confirmation expired. Try again.',
      });
    }

    // Check if already used
    if (ackToken.usedAt) {
      throw new ConflictException({
        code: 'ACK_TOKEN_INVALID',
        message: 'Confirmation expired. Try again.',
      });
    }

    // Verify bindings
    if (
      ackToken.organizationId !== organizationId ||
      ackToken.workspaceId !== workspaceId ||
      ackToken.projectId !== projectId ||
      ackToken.userId !== userId ||
      ackToken.operationCode !== operationCode ||
      ackToken.targetEntityId !== targetEntityId ||
      ackToken.payloadHash !== payloadHash
    ) {
      throw new ConflictException({
        code: 'ACK_TOKEN_INVALID',
        message: 'Confirmation expired. Try again.',
      });
    }

    // Mark as used
    ackToken.usedAt = new Date();
    await repo.save(ackToken);
  }

  /**
   * Build payload hash from change request
   */
  buildPayloadHash(
    operationCode: string,
    changePayload: Record<string, any>,
  ): string {
    const payloadString = JSON.stringify({
      operation: operationCode,
      ...changePayload,
    });
    return createHash('sha256').update(payloadString).digest('hex');
  }
}
