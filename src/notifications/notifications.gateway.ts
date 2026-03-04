import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Authenticate via JWT token from query or auth header
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn('Connection rejected: No token provided');
        client.disconnect();
        return;
      }

      // Verify JWT token
      let payload;
      try {
        payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        });
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          this.logger.warn(`Connection rejected: Token expired for socket ${client.id}`);
          client.emit('auth_error', { message: 'Token expired' });
        } else {
          this.logger.warn(`Connection rejected: Invalid token for socket ${client.id}`);
        }
        client.disconnect();
        return;
      }

      // Get user from database
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        this.logger.warn(`Connection rejected: User not found: ${payload.sub}`);
        client.disconnect();
        return;
      }

      // Attach user info to socket
      client.userId = user.id;
      client.user = user;

      // Track user socket
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(client.id);

      // Join user-specific room
      client.join(`user:${user.id}`);

      this.logger.log(`User connected: ${user.email} (${client.id})`);

      // Send unread notifications count
      const unreadCount = await this.notificationsService.getUnreadCount(
        user.id,
      );
      client.emit('unread-count', { count: unreadCount });
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const sockets = this.userSockets.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }
      this.logger.log(`User disconnected: ${client.userId} (${client.id})`);
    }
  }

  // Send notification to specific user
  async sendNotificationToUser(userId: string, notification: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets && sockets.size > 0) {
      this.server.to(`user:${userId}`).emit('notification', notification);

      // Update unread count
      const unreadCount = await this.notificationsService.getUnreadCount(
        userId,
      );
      this.server.to(`user:${userId}`).emit('unread-count', { count: unreadCount });
    }
  }

  // Send notification to multiple users
  async sendNotificationToUsers(userIds: string[], notification: any) {
    userIds.forEach((userId) => {
      this.sendNotificationToUser(userId, notification);
    });
  }

  // Client subscribes to notifications
  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: AuthenticatedSocket) {
    if (client.userId) {
      this.logger.log(`User subscribed to notifications: ${client.userId}`);
      return { success: true };
    }
    return { success: false, error: 'Not authenticated' };
  }

  // Client marks notification as read
  @SubscribeMessage('mark-read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ) {
    if (!client.userId) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      await this.notificationsService.markAsRead(
        data.notificationId,
        client.userId,
      );

      // Update unread count
      const unreadCount = await this.notificationsService.getUnreadCount(
        client.userId,
      );
      client.emit('unread-count', { count: unreadCount });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get unread count
  @SubscribeMessage('get-unread-count')
  async handleGetUnreadCount(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return { success: false, error: 'Not authenticated' };
    }

    const count = await this.notificationsService.getUnreadCount(
      client.userId,
    );
    return { success: true, count };
  }
}
