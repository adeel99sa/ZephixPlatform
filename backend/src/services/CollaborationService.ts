import { Server as SocketServer, Socket } from 'socket.io';
import { Server } from 'http';
import { createClient } from 'redis';
import { config } from '../config';
import {
  RealtimeEvent,
  RealtimeEventType,
  UserPresence,
  CursorPosition,
  Selection,
  BRDDocument,
  Comment,
  ChangeAction,
} from '../../shared/types';
import { BRDDocument as BRDDocumentModel, User, ChangeHistory } from '../models';

interface SocketData {
  userId: string;
  organizationId: string;
  documentId?: string;
}

export class CollaborationService {
  private io: SocketServer;
  private redisClient: ReturnType<typeof createClient>;
  private redisSub: ReturnType<typeof createClient>;
  private userPresence: Map<string, UserPresence> = new Map();

  constructor(server: Server) {
    // Initialize Socket.io
    this.io = new SocketServer(server, {
      cors: {
        origin: config.frontend.url,
        credentials: true,
      },
    });

    // Initialize Redis for pub/sub
    this.redisClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
    });

    this.redisSub = this.redisClient.duplicate();
    
    this.initializeRedis();
    this.setupSocketHandlers();
  }

  private async initializeRedis() {
    await this.redisClient.connect();
    await this.redisSub.connect();

    // Subscribe to Redis channels for cross-server communication
    await this.redisSub.subscribe('document-updates', (message) => {
      const event = JSON.parse(message);
      this.broadcastToDocument(event.documentId, event.type, event.data);
    });
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`User connected: ${socket.id}`);

      // Authentication middleware
      socket.use(async (event, next) => {
        const token = socket.handshake.auth.token;
        try {
          // Verify JWT token and attach user data
          const userData = await this.verifyToken(token);
          socket.data = userData;
          next();
        } catch (error) {
          next(new Error('Authentication failed'));
        }
      });

      // Join document room
      socket.on('join-document', async (documentId: string) => {
        try {
          const { userId, organizationId } = socket.data as SocketData;
          
          // Verify user has access to document
          const hasAccess = await this.verifyDocumentAccess(userId, documentId);
          if (!hasAccess) {
            socket.emit('error', { message: 'Access denied' });
            return;
          }

          // Join the document room
          socket.join(`doc:${documentId}`);
          socket.data.documentId = documentId;

          // Update user presence
          const presence: UserPresence = {
            userId,
            documentId,
            status: 'active',
            lastSeen: new Date(),
          };
          this.userPresence.set(userId, presence);

          // Notify others in the document
          this.broadcastEvent({
            type: RealtimeEventType.USER_JOINED,
            documentId,
            userId,
            data: { user: await this.getUserInfo(userId) },
            timestamp: new Date(),
          });

          // Send current document state and active users
          const document = await BRDDocumentModel.findByPk(documentId);
          const activeUsers = await this.getActiveUsers(documentId);
          
          socket.emit('document-state', {
            document,
            activeUsers,
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to join document' });
        }
      });

      // Field update
      socket.on('field-update', async (data: {
        fieldId: string;
        value: any;
        version: number;
      }) => {
        try {
          const { userId, documentId } = socket.data as SocketData;
          if (!documentId) return;

          // Apply the update
          const updated = await this.applyFieldUpdate(
            documentId,
            userId,
            data.fieldId,
            data.value,
            data.version
          );

          if (updated) {
            // Broadcast to all users in the document
            this.broadcastEvent({
              type: RealtimeEventType.FIELD_UPDATED,
              documentId,
              userId,
              data: {
                fieldId: data.fieldId,
                value: data.value,
                version: updated.version,
              },
              timestamp: new Date(),
            });
          } else {
            // Version conflict
            socket.emit('version-conflict', {
              fieldId: data.fieldId,
              currentVersion: await this.getCurrentVersion(documentId),
            });
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to update field' });
        }
      });

      // Cursor position update
      socket.on('cursor-position', (data: CursorPosition) => {
        const { userId, documentId } = socket.data as SocketData;
        if (!documentId) return;

        const presence = this.userPresence.get(userId);
        if (presence) {
          presence.cursor = data;
          presence.lastSeen = new Date();
        }

        // Broadcast cursor position to others
        socket.to(`doc:${documentId}`).emit('user-cursor', {
          userId,
          cursor: data,
        });
      });

      // Selection update
      socket.on('selection-change', (data: Selection) => {
        const { userId, documentId } = socket.data as SocketData;
        if (!documentId) return;

        const presence = this.userPresence.get(userId);
        if (presence) {
          presence.selection = data;
          presence.lastSeen = new Date();
        }

        // Broadcast selection to others
        socket.to(`doc:${documentId}`).emit('user-selection', {
          userId,
          selection: data,
        });
      });

      // Add comment
      socket.on('add-comment', async (data: {
        content: string;
        fieldId?: string;
        parentId?: string;
        mentions?: string[];
      }) => {
        try {
          const { userId, documentId } = socket.data as SocketData;
          if (!documentId) return;

          const comment = await this.addComment(
            documentId,
            userId,
            data.content,
            data.fieldId,
            data.parentId,
            data.mentions
          );

          // Broadcast new comment
          this.broadcastEvent({
            type: RealtimeEventType.COMMENT_ADDED,
            documentId,
            userId,
            data: { comment },
            timestamp: new Date(),
          });

          // Send notifications to mentioned users
          if (data.mentions?.length) {
            await this.notifyMentionedUsers(data.mentions, comment);
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to add comment' });
        }
      });

      // Status change
      socket.on('status-change', async (newStatus: string) => {
        try {
          const { userId, documentId } = socket.data as SocketData;
          if (!documentId) return;

          const updated = await this.updateDocumentStatus(
            documentId,
            userId,
            newStatus
          );

          if (updated) {
            this.broadcastEvent({
              type: RealtimeEventType.STATUS_CHANGED,
              documentId,
              userId,
              data: { status: newStatus },
              timestamp: new Date(),
            });
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to update status' });
        }
      });

      // User activity status
      socket.on('activity-status', (status: 'active' | 'idle' | 'away') => {
        const { userId } = socket.data as SocketData;
        const presence = this.userPresence.get(userId);
        if (presence) {
          presence.status = status;
          presence.lastSeen = new Date();
        }
      });

      // Leave document
      socket.on('leave-document', () => {
        const { userId, documentId } = socket.data as SocketData;
        if (!documentId) return;

        socket.leave(`doc:${documentId}`);
        this.userPresence.delete(userId);

        // Notify others
        this.broadcastEvent({
          type: RealtimeEventType.USER_LEFT,
          documentId,
          userId,
          data: {},
          timestamp: new Date(),
        });
      });

      // Disconnect
      socket.on('disconnect', () => {
        const { userId, documentId } = socket.data as SocketData;
        
        if (userId) {
          this.userPresence.delete(userId);
        }

        if (documentId) {
          this.broadcastEvent({
            type: RealtimeEventType.USER_LEFT,
            documentId,
            userId,
            data: {},
            timestamp: new Date(),
          });
        }

        console.log(`User disconnected: ${socket.id}`);
      });
    });
  }

  // Helper methods
  private async verifyToken(token: string): Promise<SocketData> {
    // TODO: Implement JWT verification
    // This is a placeholder - implement proper JWT verification
    return {
      userId: 'user-id',
      organizationId: 'org-id',
    };
  }

  private async verifyDocumentAccess(userId: string, documentId: string): Promise<boolean> {
    // TODO: Implement access control
    // Check if user has permission to access the document
    return true;
  }

  private async getUserInfo(userId: string) {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
    });
    return user;
  }

  private async getActiveUsers(documentId: string) {
    const activeUsers = [];
    for (const [userId, presence] of this.userPresence.entries()) {
      if (presence.documentId === documentId) {
        const user = await this.getUserInfo(userId);
        activeUsers.push({
          ...user?.toJSON(),
          presence,
        });
      }
    }
    return activeUsers;
  }

  private async applyFieldUpdate(
    documentId: string,
    userId: string,
    fieldId: string,
    value: any,
    version: number
  ): Promise<BRDDocument | null> {
    const document = await BRDDocumentModel.findByPk(documentId);
    if (!document || document.version !== version) {
      return null;
    }

    // Update document data
    document.data = {
      ...document.data,
      [fieldId]: value,
    };
    document.version += 1;
    await document.save();

    // Record change history
    await ChangeHistory.create({
      documentId,
      userId,
      action: ChangeAction.UPDATED,
      fieldId,
      newValue: value,
      timestamp: new Date(),
    });

    return document;
  }

  private async getCurrentVersion(documentId: string): Promise<number> {
    const document = await BRDDocumentModel.findByPk(documentId);
    return document?.version || 0;
  }

  private async addComment(
    documentId: string,
    userId: string,
    content: string,
    fieldId?: string,
    parentId?: string,
    mentions?: string[]
  ): Promise<Comment> {
    // TODO: Implement comment creation
    // This is a placeholder
    return {
      id: 'comment-id',
      userId,
      content,
      fieldId,
      parentId,
      createdAt: new Date(),
      mentions,
    };
  }

  private async updateDocumentStatus(
    documentId: string,
    userId: string,
    newStatus: string
  ): Promise<boolean> {
    const document = await BRDDocumentModel.findByPk(documentId);
    if (!document) return false;

    document.status = newStatus as any;
    await document.save();

    // Record change history
    await ChangeHistory.create({
      documentId,
      userId,
      action: ChangeAction.UPDATED,
      fieldId: 'status',
      oldValue: document.status,
      newValue: newStatus,
      timestamp: new Date(),
    });

    return true;
  }

  private async notifyMentionedUsers(userIds: string[], comment: Comment) {
    // TODO: Implement notification system
    // Send notifications to mentioned users
  }

  private broadcastEvent(event: RealtimeEvent) {
    // Broadcast to document room
    this.io.to(`doc:${event.documentId}`).emit('realtime-event', event);

    // Publish to Redis for cross-server communication
    this.redisClient.publish('document-updates', JSON.stringify(event));
  }

  private broadcastToDocument(documentId: string, eventType: string, data: any) {
    this.io.to(`doc:${documentId}`).emit(eventType, data);
  }

  // Public methods for external use
  public async notifyDocumentUpdate(documentId: string, updateType: string, data: any) {
    this.broadcastToDocument(documentId, updateType, data);
  }

  public async getDocumentPresence(documentId: string): Promise<UserPresence[]> {
    const presence = [];
    for (const [userId, userPresence] of this.userPresence.entries()) {
      if (userPresence.documentId === documentId) {
        presence.push(userPresence);
      }
    }
    return presence;
  }
}