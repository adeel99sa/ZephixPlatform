import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { KPIAggregationService } from './kpi-aggregation.service';

@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL || 'https://getzephix.com'
      : /^http:\/\/localhost:\d+$/,
    credentials: true,
  },
  namespace: '/kpi',
})
export class KPIGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(KPIGateway.name);
  private readonly connectedClients = new Map<string, { socket: Socket; organizationId: string }>();

  constructor(private readonly kpiAggregationService: KPIAggregationService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { organizationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Client ${client.id} subscribed to organization ${data.organizationId}`);
    this.connectedClients.set(client.id, { socket: client, organizationId: data.organizationId });
    
    // Join organization room for targeted updates
    client.join(`org:${data.organizationId}`);
    
    return { message: 'Subscribed successfully' };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client ${client.id} unsubscribed`);
    this.connectedClients.delete(client.id);
    
    // Leave all rooms
    client.rooms.forEach(room => {
      if (room !== client.id) {
        client.leave(room);
      }
    });
    
    return { message: 'Unsubscribed successfully' };
  }

  /**
   * Emit KPI update to all connected clients for an organization
   */
  async emitKPIUpdate(organizationId: string, updateType: string, data: any) {
    this.logger.log(`Emitting KPI update: ${updateType} for organization ${organizationId}`);
    
    this.server.to(`org:${organizationId}`).emit('kpi.update', {
      type: updateType,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit project KPI update
   */
  async emitProjectUpdate(projectId: string, organizationId: string, kpis: any) {
    await this.emitKPIUpdate(organizationId, 'project.updated', {
      projectId,
      kpis,
    });
  }

  /**
   * Emit workspace KPI update
   */
  async emitWorkspaceUpdate(workspaceId: string, organizationId: string, kpis: any) {
    await this.emitKPIUpdate(organizationId, 'workspace.updated', {
      workspaceId,
      kpis,
    });
  }

  /**
   * Emit executive dashboard update
   */
  async emitExecutiveUpdate(organizationId: string, kpis: any) {
    await this.emitKPIUpdate(organizationId, 'executive.updated', {
      kpis,
    });
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get connected clients for an organization
   */
  getConnectedClientsForOrganization(organizationId: string): number {
    return Array.from(this.connectedClients.values()).filter(
      client => client.organizationId === organizationId
    ).length;
  }
}
