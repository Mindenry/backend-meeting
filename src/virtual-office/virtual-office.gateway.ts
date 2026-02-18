import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { VirtualOfficeService } from './virtual-office.service';

@WebSocketGateway({
  namespace: '/virtual-office',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class VirtualOfficeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly virtualOfficeService: VirtualOfficeService) {}

  handleConnection(client: Socket) {
    console.log(`Virtual Office client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Virtual Office client disconnected: ${client.id}`);
    // Clean up presence on disconnect
    // This would need to track which rooms the user is in
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string; position?: { x: number; y: number } },
  ) {
    try {
      const presence = await this.virtualOfficeService.joinRoom(
        data.roomId,
        data.userId,
        data.position,
      );

      // Join socket room
      client.join(`room:${data.roomId}`);

      // Notify others in room
      client.to(`room:${data.roomId}`).emit('user-joined', presence);

      // Send current presences to the new user
      const presences = await this.virtualOfficeService.getRoomPresences(data.roomId);
      client.emit('room-presences', presences);

      return { success: true, presence };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    try {
      await this.virtualOfficeService.leaveRoom(data.roomId, data.userId);
      client.leave(`room:${data.roomId}`);
      client.to(`room:${data.roomId}`).emit('user-left', { userId: data.userId });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('update-position')
  async handleUpdatePosition(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string; position: { x: number; y: number } },
  ) {
    try {
      const presence = await this.virtualOfficeService.updatePresence(
        data.roomId,
        data.userId,
        { position: data.position },
      );

      // Broadcast to others in room
      client.to(`room:${data.roomId}`).emit('position-updated', presence);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('update-status')
  async handleUpdateStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string; status: string },
  ) {
    try {
      const presence = await this.virtualOfficeService.updatePresence(
        data.roomId,
        data.userId,
        { status: data.status as any },
      );

      client.to(`room:${data.roomId}`).emit('status-updated', presence);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('request-presences')
  async handleRequestPresences(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const presences = await this.virtualOfficeService.getRoomPresences(data.roomId);
      client.emit('room-presences', presences);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
