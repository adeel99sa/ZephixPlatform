import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AIAssistantService {
  private claudeApiKey: string | undefined;

  constructor(private configService: ConfigService) {
    this.claudeApiKey = this.configService.get<string>('CLAUDE_API_KEY');
  }

  async processQuery(query: string, context: any) {
    if (!this.claudeApiKey) {
      return { response: 'AI assistant not configured. Add CLAUDE_API_KEY to .env' };
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.claudeApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `You are an AI assistant for a project management platform. Context: ${JSON.stringify(context)}. Query: ${query}`,
            },
          ],
        }),
      });

      const data = await response.json();
      return { response: data.content[0].text };
    } catch (error) {
      console.error('Claude API error:', error);
      return { response: 'Failed to process query' };
    }
  }

  async getTokenUsage(userId: string, organizationId: string) {
    // Mock implementation - replace with actual token tracking
    return {
      userId,
      organizationId,
      tokensUsed: 0,
      tokensRemaining: 100000,
      period: 'monthly'
    };
  }
}
