import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Intelligence')
@Controller('intelligence')
export class IntelligenceController {
  @Get()
  @ApiOperation({
    summary: 'Intelligence Overview',
    description: 'Provides an overview of available AI intelligence services and endpoints',
  })
  @ApiResponse({
    status: 200,
    description: 'Available intelligence services',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        services: {
          type: 'object',
          properties: {
            'ai-intelligence': {
              type: 'object',
              properties: {
                description: { type: 'string' },
                endpoints: { type: 'array', items: { type: 'string' } },
              },
            },
            'ai-chat': {
              type: 'object',
              properties: {
                description: { type: 'string' },
                endpoints: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  })
  getIntelligenceOverview() {
    return {
      message: 'Zephix AI Intelligence Platform',
      timestamp: new Date().toISOString(),
      services: {
        'ai-intelligence': {
          description: 'Comprehensive AI-powered project intelligence and analysis',
          baseUrl: '/ai-intelligence',
          endpoints: [
            'POST /analyze-project-context - Analyze project context and generate intelligence',
            'POST /process-documents - Process and analyze project documents',
            'POST /create-adaptive-plan - Create adaptive project plans',
            'POST /optimize-resources - Optimize resource allocation',
            'POST /monitor-project-health - Monitor project health metrics',
            'POST /generate-communication - Generate intelligent communications',
            'POST /learn-from-outcomes - Learn from project outcomes',
            'POST /comprehensive-project-analysis - Complete project analysis',
            'POST /pm-document-analysis - Analyze PM documents',
            'POST /pm-document-comparison - Compare documents',
            'POST /pm-document-insights - Generate document insights',
          ],
        },
        'ai-chat': {
          description: 'AI-powered chat interface for project management assistance',
          baseUrl: '/ai-chat',
          endpoints: [
            'POST /stream - Stream AI chat responses',
            'POST /analyze - Analyze chat content',
            'GET /history - Get chat history',
          ],
        },
        'ai-pm-assistant': {
          description: 'AI-powered project management assistant',
          baseUrl: '/ai-pm-assistant',
          endpoints: [
            'POST /analyze-project - Analyze project data',
            'POST /generate-recommendations - Generate PM recommendations',
            'POST /risk-assessment - Assess project risks',
          ],
        },
        'brd': {
          description: 'Business Requirements Document management with AI insights',
          baseUrl: '/api/pm/brds',
          endpoints: [
            'GET / - List BRDs',
            'POST / - Create new BRD',
            'GET /:id - Get BRD details',
            'PUT /:id - Update BRD',
            'DELETE /:id - Delete BRD',
            'GET /search - Search BRDs',
            'GET /statistics - Get BRD statistics',
          ],
        },
      },
      usage: {
        authentication: 'Most endpoints require JWT authentication via Authorization: Bearer <token>',
        contentType: 'application/json',
        cors: 'CORS is enabled for development',
      },
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Intelligence Service Health',
    description: 'Check the health status of intelligence services',
  })
  getIntelligenceHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        'ai-intelligence': 'operational',
        'ai-chat': 'operational',
        'ai-pm-assistant': 'operational',
        'document-intelligence': 'operational',
        'brd-intelligence': 'operational',
      },
      uptime: process.uptime(),
      version: '1.0.0',
    };
  }
}
