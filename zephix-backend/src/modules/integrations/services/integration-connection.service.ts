import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationConnection } from '../entities/integration-connection.entity';
import { CreateIntegrationConnectionDto } from '../dto/create-integration-connection.dto';
import { IntegrationEncryptionService } from './integration-encryption.service';

@Injectable()
export class IntegrationConnectionService {
  private readonly logger = new Logger(IntegrationConnectionService.name);

  constructor(
    @InjectRepository(IntegrationConnection)
    private connectionRepository: Repository<IntegrationConnection>,
    private encryptionService: IntegrationEncryptionService,
  ) {}

  async createConnection(
    organizationId: string,
    dto: CreateIntegrationConnectionDto,
  ): Promise<IntegrationConnection> {
    // Check for existing connection (unique constraint: orgId + type + baseUrl)
    const existing = await this.connectionRepository.findOne({
      where: {
        organizationId,
        type: dto.type,
        baseUrl: dto.baseUrl,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Integration connection already exists for ${dto.type} at ${dto.baseUrl}`,
      );
    }

    // Encrypt secrets before save
    const encryptedSecrets: any = {};
    if (dto.apiToken) {
      encryptedSecrets.apiToken = this.encryptionService.encrypt(dto.apiToken);
    }
    if (dto.webhookSecret) {
      encryptedSecrets.webhookSecret = this.encryptionService.encrypt(
        dto.webhookSecret,
      );
    }

    // Create connection
    const connection = this.connectionRepository.create({
      organizationId,
      type: dto.type,
      baseUrl: dto.baseUrl,
      email: dto.email,
      authType: 'api_token', // Only api_token for Phase 2
      encryptedSecrets,
      enabled: dto.enabled !== undefined ? dto.enabled : true,
      pollingEnabled: dto.pollingEnabled || false,
      webhookEnabled: false, // Not in Phase 2 scope
      projectMappings: dto.projectMappings,
      jqlFilter: dto.jqlFilter,
      status: 'active',
      errorCount: 0,
    });

    const saved = await this.connectionRepository.save(connection);

    // Log without secrets
    this.logger.log('Integration connection created', {
      connectionId: saved.id,
      organizationId,
      type: saved.type,
      baseUrl: saved.baseUrl,
    });

    return saved;
  }

  async listConnections(
    organizationId: string,
  ): Promise<IntegrationConnection[]> {
    return await this.connectionRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async getConnectionById(
    connectionId: string,
    organizationId: string,
  ): Promise<IntegrationConnection | null> {
    return await this.connectionRepository.findOne({
      where: {
        id: connectionId,
        organizationId,
      },
    });
  }

  /**
   * Sanitize connection for response (remove secrets)
   */
  sanitizeConnection(connection: IntegrationConnection): any {
    const { encryptedSecrets, webhookSecret, ...sanitized } = connection;
    return sanitized;
  }
}
