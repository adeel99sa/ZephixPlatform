import { Injectable, Logger } from '@nestjs/common';
import { IntegrationEncryptionService } from './integration-encryption.service';
import { IntegrationConnection } from '../entities/integration-connection.entity';

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    assignee?: {
      emailAddress: string;
    };
    updated: string;
    duedate?: string;
    timeoriginalestimate?: number;
    customfield_10020?: Array<{
      startDate?: string;
      endDate?: string;
    }>;
  };
}

export interface JiraSearchResponse {
  total: number;
  startAt: number;
  maxResults: number;
  issues: JiraIssue[];
}

@Injectable()
export class JiraClientService {
  private readonly logger = new Logger(JiraClientService.name);

  constructor(private encryptionService: IntegrationEncryptionService) {}

  private formatJiraDate(date: Date): string {
    // Jira JQL format: "yyyy-MM-dd HH:mm"
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  private async getAuthHeaders(
    connection: IntegrationConnection,
  ): Promise<Record<string, string>> {
    const decryptedSecrets = await this.decryptSecrets(connection);
    // Jira Basic auth: base64(email + ":" + apiToken)
    const auth = Buffer.from(
      `${connection.email}:${decryptedSecrets.apiToken || ''}`,
    ).toString('base64');

    return {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    };
  }

  private async decryptSecrets(connection: IntegrationConnection): Promise<{
    apiToken?: string;
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
  }> {
    const decrypted: any = {};
    if (connection.encryptedSecrets.apiToken) {
      decrypted.apiToken = this.encryptionService.decrypt(
        connection.encryptedSecrets.apiToken,
      );
    }
    if (connection.encryptedSecrets.clientId) {
      decrypted.clientId = this.encryptionService.decrypt(
        connection.encryptedSecrets.clientId,
      );
    }
    if (connection.encryptedSecrets.clientSecret) {
      decrypted.clientSecret = this.encryptionService.decrypt(
        connection.encryptedSecrets.clientSecret,
      );
    }
    if (connection.encryptedSecrets.refreshToken) {
      decrypted.refreshToken = this.encryptionService.decrypt(
        connection.encryptedSecrets.refreshToken,
      );
    }
    return decrypted;
  }

  async searchIssues(
    connection: IntegrationConnection,
    jql: string,
    startAt: number = 0,
    maxResults: number = 50,
  ): Promise<JiraSearchResponse> {
    const headers = await this.getAuthHeaders(connection);
    const url = `${connection.baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&startAt=${startAt}&maxResults=${maxResults}&fields=id,key,summary,assignee,updated,duedate,timeoriginalestimate,customfield_10020`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(
          `Jira API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      return {
        total: data.total || 0,
        startAt: data.startAt || 0,
        maxResults: data.maxResults || 50,
        issues: (data.issues || []).map((issue: any) => ({
          id: issue.id,
          key: issue.key,
          fields: {
            summary: issue.fields?.summary || '',
            assignee: issue.fields?.assignee
              ? {
                  emailAddress: issue.fields.assignee.emailAddress || '',
                }
              : undefined,
            updated: issue.fields?.updated || '',
            duedate: issue.fields?.duedate || undefined,
            timeoriginalestimate:
              issue.fields?.timeoriginalestimate || undefined,
            customfield_10020: issue.fields?.customfield_10020 || undefined,
          },
        })),
      };
    } catch (error: any) {
      this.logger.error(`Failed to search Jira issues: ${error.message}`);
      throw error;
    }
  }

  async testConnection(
    connection: IntegrationConnection,
  ): Promise<{ connected: boolean; message: string }> {
    try {
      const headers = await this.getAuthHeaders(connection);
      const url = `${connection.baseUrl}/rest/api/3/myself`;

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        return {
          connected: false,
          message: `Connection failed: ${response.status} ${response.statusText}`,
        };
      }

      return {
        connected: true,
        message: 'Connection successful',
      };
    } catch (error: any) {
      return {
        connected: false,
        message: `Connection error: ${error.message}`,
      };
    }
  }
}
