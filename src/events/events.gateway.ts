import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { MeetingParticipantsService } from '../meeting-participants/meeting-participants.service';

interface MeetingParticipant {
  peerId: string;
  name: string;
  avatar?: string;
  socketId: string;
  state: {
    isMuted: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
    isHandRaised: boolean;
  };
}

interface MeetingRecordingStatusPayload {
  meetingId: string;
  peerId: string;
  userId?: string;
  userName: string;
  isRecording: boolean;
  startedAt?: string;
}

@WebSocketGateway({
  cors: {
    origin: true, // Allow all origins
    credentials: true,
  },
})
export class EventsGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly messagesService: MessagesService,
    private readonly participantsService: MeetingParticipantsService,
  ) {}

  // Track participants in each meeting
  private meetingParticipants: Map<string, MeetingParticipant[]> = new Map();
  // Map socket IDs to meeting IDs for cleanup on disconnect
  private socketMeetings: Map<string, { meetingId: string; peerId: string }> =
    new Map();
  // Online presence: socketId -> { userId, name, avatar }
  private onlineUsers: Map<
    string,
    { userId: string; name: string; avatar?: string }
  > = new Map();
  private taskViewers: Map<
    string,
    Set<{ userId: string; name: string; avatar?: string; socketId: string }>
  > = new Map();
  // Cache meeting titles so getActiveRoomsData can return real titles
  private meetingTitles: Map<string, string> = new Map();
  // Track userId -> meetingId for rejoin on reconnect
  private userMeetings: Map<
    string,
    { meetingId: string; peerId: string; peerName: string; state: any }
  > = new Map();
  // Periodic cleanup interval
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  onModuleInit() {
    // Periodic cleanup every 30 seconds to remove stale participants
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleParticipants();
    }, 30000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    // Immediately send active rooms to newly connected client
    const rooms = this.getActiveRoomsData();
    client.emit('rooms:active', rooms);
  }

  async handleDisconnect(client: Socket) {
    console.log(`[Disconnect] Client ${client.id} disconnected`);

    const meetingInfo = this.socketMeetings.get(client.id);
    if (meetingInfo) {
      console.log(
        `[Disconnect] Removing peer ${meetingInfo.peerId} from meeting ${meetingInfo.meetingId}`,
      );
      await this.removeMeetingParticipant(
        meetingInfo.meetingId,
        meetingInfo.peerId,
        client,
      );
      this.socketMeetings.delete(client.id);
      this.broadcastActiveRooms();
    }

    // Clean up presence
    if (this.onlineUsers.has(client.id)) {
      this.onlineUsers.delete(client.id);
      this.broadcastPresence();
    }

    // Clean up task viewing
    for (const [taskId, viewers] of this.taskViewers.entries()) {
      const viewer = Array.from(viewers).find((v) => v.socketId === client.id);
      if (viewer) {
        viewers.delete(viewer);
        if (viewers.size === 0) {
          this.taskViewers.delete(taskId);
        } else {
          this.broadcastTaskViewing(taskId);
        }
      }
    }
  }

  private async removeMeetingParticipant(
    meetingId: string,
    peerId: string,
    client: Socket,
  ) {
    const participants = this.meetingParticipants.get(meetingId) || [];
    console.log(
      `[RemoveParticipant] Before: ${participants.length} participants in meeting ${meetingId}`,
    );

    const updated = participants.filter((p) => p.peerId !== peerId);
    console.log(
      `[RemoveParticipant] After: ${updated.length} participants (removed peer ${peerId})`,
    );

    this.meetingParticipants.set(meetingId, updated);

    // Record leave time in database if userId is available
    const userInfo = this.onlineUsers.get(client.id);
    if (userInfo?.userId && meetingId !== 'quick-huddle') {
      try {
        await this.participantsService.leaveMeeting(meetingId, userInfo.userId);
      } catch (error) {
        // Silently fail if participant doesn't exist or meeting is not found
        console.warn(
          `Failed to record leave time for user ${userInfo.userId} in meeting ${meetingId}:`,
          error,
        );
      }
    }

    // Notify others in the meeting room
    client
      .to(`meeting:${meetingId}`)
      .emit('meeting:participant:left', { peerId });
    client.leave(`meeting:${meetingId}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MEETING ROOM SIGNALING
  // ─────────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('meeting:join')
  async handleMeetingJoin(
    @MessageBody()
    data: {
      meetingId: string;
      peerId: string;
      peerName: string;
      state: any;
      userId?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { meetingId, peerId, peerName, state, userId } = data;

    console.log(
      `[Join] Peer ${peerId} joining meeting ${meetingId}, socket: ${client.id}`,
    );

    // Join the meeting room
    client.join(`meeting:${meetingId}`);

    // Track this socket's meeting
    this.socketMeetings.set(client.id, { meetingId, peerId });

    // Cache meeting title from DB (only once per meeting)
    if (!this.meetingTitles.has(meetingId) && meetingId !== 'quick-huddle') {
      try {
        const meeting = await this.prisma.meeting.findUnique({
          where: { id: meetingId },
          select: { title: true },
        });
        if (meeting?.title) {
          this.meetingTitles.set(meetingId, meeting.title);
        }
      } catch {
        // Silently fail – the generic name will be used
      }
    }

    // Record join time in database if userId is available and it's not a quick huddle
    const userInfo = this.onlineUsers.get(client.id);
    const actualUserId = userId || userInfo?.userId;
    if (actualUserId && meetingId !== 'quick-huddle') {
      try {
        await this.participantsService.joinMeeting(
          meetingId,
          actualUserId,
          undefined,
          true,
        );
      } catch (error) {
        // Silently fail if meeting doesn't exist or user is not authorized
        // This allows the WebSocket connection to continue even if DB record fails
        console.warn(
          `Failed to record join time for user ${actualUserId} in meeting ${meetingId}:`,
          error,
        );
      }
    }

    // Get existing participants
    const participants = this.meetingParticipants.get(meetingId) || [];

    // Add new participant
    const newParticipant: MeetingParticipant = {
      peerId,
      name: peerName,
      avatar: userInfo?.avatar,
      socketId: client.id,
      state: state || {
        isMuted: false,
        isCameraOn: true,
        isScreenSharing: false,
        isHandRaised: false,
      },
    };
    participants.push(newParticipant);
    this.meetingParticipants.set(meetingId, participants);

    // Track user -> meeting for rejoin on reconnect
    const actualUserId2 = userId || userInfo?.userId;
    if (actualUserId2) {
      this.userMeetings.set(actualUserId2, {
        meetingId,
        peerId,
        peerName,
        state: newParticipant.state,
      });
    }

    // Send existing participants to the new joiner
    const existingParticipants = participants
      .filter((p) => p.peerId !== peerId)
      .map((p) => ({
        peerId: p.peerId,
        name: p.name,
        avatar: p.avatar,
        state: p.state,
      }));

    client.emit('meeting:participants', existingParticipants);

    // Notify others about new participant
    client.to(`meeting:${meetingId}`).emit('meeting:participant:joined', {
      peerId,
      name: peerName,
      avatar: userInfo?.avatar,
      state: newParticipant.state,
    });

    // Broadcast to all clients (for Meetings page)
    this.broadcastActiveRooms();

    return {
      event: 'meeting:joined',
      meetingId,
      participantCount: participants.length,
    };
  }

  @SubscribeMessage('meeting:leave')
  async handleMeetingLeave(
    @MessageBody() data: { meetingId: string; peerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(
      `[Leave] Peer ${data.peerId} leaving meeting ${data.meetingId}`,
    );

    // Mark as properly left before removing
    const meetingInfo = this.socketMeetings.get(client.id);
    if (meetingInfo) {
      // Clear the tracking first so handleDisconnect knows we left properly
      this.socketMeetings.delete(client.id);
    }

    await this.removeMeetingParticipant(data.meetingId, data.peerId, client);

    // Remove user meeting tracking
    const userInfo = this.onlineUsers.get(client.id);
    if (userInfo?.userId) {
      this.userMeetings.delete(userInfo.userId);
    }

    // Broadcast to all clients that someone left (for Meetings page)
    console.log(
      `[Leave] Broadcasting updated active rooms after peer ${data.peerId} left`,
    );
    this.broadcastActiveRooms();

    return { event: 'meeting:left', meetingId: data.meetingId };
  }

  // Rejoin a meeting after socket reconnection
  @SubscribeMessage('meeting:rejoin')
  async handleMeetingRejoin(
    @MessageBody()
    data: {
      meetingId: string;
      peerId: string;
      peerName: string;
      state: any;
      userId?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { meetingId, peerId, peerName, state, userId } = data;

    console.log(
      `[Rejoin] Peer ${peerId} rejoining meeting ${meetingId} with new socket ${client.id}`,
    );

    // Get existing participants
    const participants = this.meetingParticipants.get(meetingId) || [];

    // Check if this peer already exists
    const existingIndex = participants.findIndex((p) => p.peerId === peerId);

    // Join the socket room
    client.join(`meeting:${meetingId}`);

    // Track this socket's meeting
    this.socketMeetings.set(client.id, { meetingId, peerId });

    // Track user -> meeting for future reconnects
    if (userId) {
      this.userMeetings.set(userId, { meetingId, peerId, peerName, state });
    }

    const userInfo = this.onlineUsers.get(client.id);

    // Update or add participant with new socket ID
    const newParticipant: MeetingParticipant = {
      peerId,
      name: peerName,
      avatar: userInfo?.avatar,
      socketId: client.id,
      state: state || {
        isMuted: false,
        isCameraOn: true,
        isScreenSharing: false,
        isHandRaised: false,
      },
    };

    if (existingIndex >= 0) {
      // Update existing participant with new socket
      participants[existingIndex] = newParticipant;
      console.log(`[Rejoin] Updated existing participant ${peerId}`);
    } else {
      // Add new participant
      participants.push(newParticipant);
      console.log(`[Rejoin] Added new participant ${peerId}`);
    }

    this.meetingParticipants.set(meetingId, participants);
    console.log(`[Rejoin] Total participants: ${participants.length}`);

    // Send existing participants to the rejoiner
    const existingParticipants = participants
      .filter((p) => p.peerId !== peerId)
      .map((p) => ({
        peerId: p.peerId,
        name: p.name,
        avatar: p.avatar,
        state: p.state,
      }));

    client.emit('meeting:participants', existingParticipants);

    // Notify others
    client.to(`meeting:${meetingId}`).emit('meeting:participant:joined', {
      peerId,
      name: peerName,
      avatar: userInfo?.avatar,
      state: newParticipant.state,
    });

    // Broadcast updated active rooms to everyone
    this.broadcastActiveRooms();

    return {
      event: 'meeting:rejoined',
      meetingId,
      participantCount: participants.length,
    };
  }

  // Get list of active rooms for the Meetings page
  @SubscribeMessage('rooms:get-active')
  handleGetActiveRooms(@ConnectedSocket() client: Socket) {
    const rooms = this.getActiveRoomsData();
    client.emit('rooms:active', rooms);
    return { event: 'rooms:active', count: rooms.length };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ONLINE PRESENCE
  // ─────────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('presence:online')
  handlePresenceOnline(
    @MessageBody() data: { userId: string; name: string; avatar?: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.onlineUsers.set(client.id, {
      userId: data.userId,
      name: data.name,
      avatar: data.avatar,
    });
    this.broadcastPresence();
    return { event: 'presence:registered' };
  }

  @SubscribeMessage('presence:get')
  handlePresenceGet(@ConnectedSocket() client: Socket) {
    const onlineList = this.getOnlineUsersData();
    client.emit('presence:update', onlineList);
    return { event: 'presence:sent' };
  }

  private getOnlineUsersData(): Array<{
    userId: string;
    name: string;
    avatar?: string;
  }> {
    // Deduplicate by userId (same user may have multiple sockets)
    const seen = new Map<
      string,
      { userId: string; name: string; avatar?: string }
    >();
    for (const [, info] of this.onlineUsers) {
      if (
        !seen.has(info.userId) ||
        (info.avatar && !seen.get(info.userId)?.avatar)
      ) {
        seen.set(info.userId, info);
      }
    }
    return Array.from(seen.values());
  }

  private broadcastPresence() {
    const onlineList = this.getOnlineUsersData();
    this.server.emit('presence:update', onlineList);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DIRECT MESSAGES
  // ─────────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('dm:send')
  async handleDmSend(
    @MessageBody()
    data: {
      id: string;
      text: string;
      senderId: string;
      senderName: string;
      receiverId: string;
      createdAt: string;
      attachments?: any[];
      mentions?: string[];
    },
    @ConnectedSocket() client: Socket,
  ) {
    // Persist DM to database so it behaves like channel messages (no localStorage dependency)
    try {
      const saved = await this.messagesService.createDirectMessage({
        id: data.id,
        text: data.text,
        senderId: data.senderId,
        receiverId: data.receiverId,
        createdAt: data.createdAt,
        attachments: data.attachments,
        mentions: data.mentions,
      });
      console.log(
        `[DM] Persisted DM ${saved.id} from ${data.senderId} to ${data.receiverId}`,
      );
    } catch (error) {
      // Log but do not block real-time delivery
      console.error('[DM] Failed to persist direct message:', error);
    }

    // Emit to receiver
    let receiverFound = false;
    for (const [socketId, userInfo] of this.onlineUsers) {
      if (userInfo.userId === data.receiverId) {
        receiverFound = true;
        console.log(
          `[DM] Emitting to receiver ${data.receiverId} on socket ${socketId}`,
        );
        this.server.to(socketId).emit('dm:message', {
          ...data,
          receiverId: data.receiverId,
          senderAvatar:
            (data as any).senderAvatar ||
            this.onlineUsers.get(client.id)?.avatar,
        });
      }
    }

    if (!receiverFound) {
      console.log(
        `[DM] Receiver ${data.receiverId} not found in onlineUsers (${this.onlineUsers.size} online)`,
      );
    }

    // Also emit back to sender so they see their own message immediately
    const senderInfo = this.onlineUsers.get(client.id);
    if (senderInfo && senderInfo.userId === data.senderId) {
      console.log(`[DM] Emitting back to sender ${data.senderId}`);
      client.emit('dm:message', {
        ...data,
        receiverId: data.receiverId,
        senderAvatar: (data as any).senderAvatar || senderInfo.avatar,
      });
    } else {
      console.log(
        `[DM] Sender ${data.senderId} not found in onlineUsers for socket ${client.id}`,
      );
    }

    return { event: 'dm:sent' };
  }

  @SubscribeMessage('user:room:change')
  handleUserRoomChange(
    @MessageBody() data: { userId: string; room: string | null },
  ) {
    this.server.emit('user:room:changed', data);
    return { event: 'room:changed' };
  }

  private getActiveRoomsData() {
    const rooms: Array<{
      roomId: string;
      name: string;
      participants: Array<{
        peerId: string;
        name: string;
        userId?: string;
        avatar?: string;
      }>;
      createdAt: Date;
    }> = [];

    console.log(
      '[ActiveRooms] Getting active rooms, meetingParticipants size:',
      this.meetingParticipants.size,
    );

    for (const [meetingId, participants] of this.meetingParticipants) {
      const roomName = `meeting:${meetingId}`;
      const roomAdapter = this.server.sockets.adapter.rooms.get(roomName);

      console.log(
        `[ActiveRooms] Meeting ${meetingId}: ${participants.length} participants in map, roomAdapter size: ${roomAdapter?.size ?? 'undefined'}`,
      );

      // Use participants from map directly - don't filter by socket room
      // The socket room is for broadcasting, not for tracking presence
      // We only remove participants on explicit leave or disconnect
      if (participants.length > 0) {
        // Use cached title, fallback to generic
        const cachedTitle = this.meetingTitles.get(meetingId);
        const displayName =
          meetingId === 'quick-huddle'
            ? 'Quick Huddle'
            : cachedTitle || `Meeting ${meetingId.slice(0, 8)}`;

        const activeParticipants = participants.map((p) => {
          const onlineInfo = this.onlineUsers.get(p.socketId);
          return {
            peerId: p.peerId,
            name: p.name,
            userId: onlineInfo?.userId,
            avatar: p.avatar || onlineInfo?.avatar,
          };
        });

        console.log(
          `[ActiveRooms] Returning room ${meetingId} with ${activeParticipants.length} participants`,
        );

        rooms.push({
          roomId: meetingId,
          name: displayName,
          participants: activeParticipants,
          createdAt: new Date(),
        });
      }
    }

    console.log('[ActiveRooms] Total rooms returning:', rooms.length);
    return rooms;
  }

  private cleanupStaleParticipants() {
    // Remove stale participants whose socket is no longer connected.
    let changed = false;
    for (const [
      meetingId,
      participants,
    ] of this.meetingParticipants.entries()) {
      const active = participants.filter((p) =>
        this.server.sockets.sockets.has(p.socketId),
      );
      if (active.length !== participants.length) {
        this.meetingParticipants.set(meetingId, active);
        changed = true;
      }
    }
    if (changed) {
      this.broadcastActiveRooms();
    }
  }

  private broadcastActiveRooms() {
    const rooms = this.getActiveRoomsData();
    console.log(
      `[BroadcastActiveRooms] Broadcasting ${rooms.length} rooms to all clients`,
    );
    this.server.emit('rooms:active', rooms);
  }

  @SubscribeMessage('meeting:participant:update')
  handleParticipantUpdate(
    @MessageBody()
    data: { meetingId: string; peerId: string; name: string; state: any },
    @ConnectedSocket() client: Socket,
  ) {
    const { meetingId, peerId, name, state } = data;

    // Update stored state
    const participants = this.meetingParticipants.get(meetingId) || [];
    const participant = participants.find((p) => p.peerId === peerId);
    if (participant) {
      participant.state = state;
    }

    // Broadcast to others in the meeting
    client
      .to(`meeting:${meetingId}`)
      .emit('meeting:participant:update', { peerId, name, state });
    return { event: 'updated' };
  }

  @SubscribeMessage('meeting:participant:mute')
  handleForceMute(
    @MessageBody() data: { meetingId: string; targetPeerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server
      .to(`meeting:${data.meetingId}`)
      .emit('meeting:participant:force_mute', { peerId: data.targetPeerId });
    return { event: 'muted' };
  }

  @SubscribeMessage('meeting:recording:status')
  handleMeetingRecordingStatus(
    @MessageBody() data: MeetingRecordingStatusPayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.meetingId || !data?.peerId || !data?.userName) {
      return { event: 'meeting:recording:ignored' };
    }

    client.to(`meeting:${data.meetingId}`).emit('meeting:recording:status', {
      peerId: data.peerId,
      userId: data.userId,
      userName: data.userName,
      isRecording: !!data.isRecording,
      startedAt: data.startedAt,
    });

    return { event: 'meeting:recording:broadcasted' };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MEETING CHAT (persisted via Channels/Messages)
  // ─────────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('meeting:chat:send')
  async handleMeetingChat(
    @MessageBody()
    data: {
      meetingId: string;
      message: {
        id: string;
        senderId: string;
        senderName: string;
        text: string;
        time?: string;
        attachments?: Array<{ url: string; name: string; type: string }>;
        mentions?: string[];
      };
    },
  ) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: data.meetingId },
      select: { id: true, teamId: true, meetingCode: true, title: true },
    });

    if (!meeting || !meeting.teamId) {
      // Fallback: keep legacy behavior (ephemeral chat)
      this.server.to(`meeting:${data.meetingId}`).emit('meeting:chat:message', {
        id: data.message.id,
        sender: data.message.senderName,
        senderId: data.message.senderId,
        time:
          data.message.time ||
          new Date().toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        text: data.message.text,
        attachments: data.message.attachments || [],
      });
      return { event: 'chat:sent' };
    }

    const channelName = `meeting-${meeting.meetingCode || meeting.id.slice(0, 8)}`;

    const channel =
      (await this.prisma.channel.findFirst({
        where: { teamId: meeting.teamId, name: channelName },
      })) ||
      (await this.prisma.channel.create({
        data: {
          teamId: meeting.teamId,
          name: channelName,
          type: 'meeting',
          description: `Meeting chat history: ${meeting.title}`,
        },
      }));

    const created = await this.messagesService.create({
      channelId: channel.id,
      senderId: data.message.senderId,
      text: data.message.text,
      attachments: data.message.attachments,
      mentions: data.message.mentions,
    });

    // Normalize attachments from DB JSON — ensure each item has url, name, type
    const rawAttachments = created.attachments;
    let normalizedAttachments: Array<{
      url: string;
      name: string;
      type: string;
    }> = [];
    if (Array.isArray(rawAttachments)) {
      normalizedAttachments = rawAttachments.map((att: any) => {
        const url = att?.url || '';
        const name = att?.name || 'attachment';
        let type = att?.type || '';
        // Detect mime type from extension if missing
        if (!type && name) {
          const ext = name.split('.').pop()?.toLowerCase() || '';
          const mimeMap: Record<string, string> = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            webp: 'image/webp',
            bmp: 'image/bmp',
            svg: 'image/svg+xml',
            mp4: 'video/mp4',
            webm: 'video/webm',
            ogg: 'video/ogg',
            mov: 'video/quicktime',
            mp3: 'audio/mpeg',
            wav: 'audio/wav',
            m4a: 'audio/mp4',
            flac: 'audio/flac',
            pdf: 'application/pdf',
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            xls: 'application/vnd.ms-excel',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            txt: 'text/plain',
          };
          type = mimeMap[ext] || 'application/octet-stream';
        }
        return { url, name, type };
      });
    }

    // Broadcast to meeting room (MeetingRoom.tsx listens to this)
    this.server.to(`meeting:${data.meetingId}`).emit('meeting:chat:message', {
      id: created.id,
      sender: created.sender?.name || data.message.senderName,
      senderId: data.message.senderId,
      senderAvatar: created.sender?.avatar || undefined,
      time: new Date(created.createdAt).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      text: created.text,
      type: 'text',
      attachments: normalizedAttachments,
    });

    return { event: 'chat:sent', channelId: channel.id, messageId: created.id };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EVENT EMISSIONS FOR SERVICES
  // ─────────────────────────────────────────────────────────────────────────────

  emitChannelCreated(channel: any) {
    this.server.emit('channel:created', channel);
  }

  emitChannelUpdated(channel: any) {
    this.server.emit('channel:updated', channel);
  }

  emitChannelDeleted(id: string) {
    this.server.emit('channel:deleted', id);
  }

  emitMeetingCreated(meeting: any) {
    this.server.emit('meeting:created', meeting);
  }

  emitMeetingUpdated(meeting: any) {
    this.server.emit('meeting:updated', meeting);
  }

  emitMeetingDeleted(id: string) {
    this.server.emit('meeting:deleted', id);
  }

  emitMessageCreated(message: any) {
    this.server
      .to(`channel:${message.channelId}`)
      .emit('message:created', message);
    // Also emit to the general server for global updates if needed
    this.server.emit('message:created', message);
  }

  emitMessageUpdated(message: any) {
    this.server
      .to(`channel:${message.channelId}`)
      .emit('message:updated', message);
  }

  emitMessageDeleted(id: string, channelId: string) {
    this.server.to(`channel:${channelId}`).emit('message:deleted', id);
  }

  emitTaskCreated(task: any) {
    this.server.emit('task:created', task);
  }

  emitTaskUpdated(task: any) {
    this.server.emit('task:updated', task);
  }

  emitTaskDeleted(id: string) {
    this.server.emit('task:deleted', id);
  }

  emitCommentAdded(taskId: string, comment: any) {
    this.server.emit('task:comment:added', { taskId, comment });
  }

  emitTeamCreated(team: any) {
    this.server.emit('team:created', team);
  }

  emitTeamUpdated(team: any) {
    this.server.emit('team:updated', team);
  }

  emitTeamMemberAdded(teamId: string, member: any) {
    this.server.emit('team:member:added', { teamId, member });
  }

  emitUserStatusChanged(userId: string, status: string) {
    this.server.emit('user:status:changed', { userId, status });
  }

  emitUserRoomChanged(userId: string, currentRoom: string | null) {
    this.server.emit('user:room:changed', { userId, currentRoom });
  }

  // Reaction events
  emitReactionAdded(messageId: string, reaction: any) {
    this.server.emit('reaction:added', { messageId, reaction });
  }

  emitReactionRemoved(messageId: string, reaction: any) {
    this.server.emit('reaction:removed', { messageId, reaction });
  }

  // Thread events
  emitThreadCreated(thread: any) {
    this.server
      .to(`channel:${thread.channelId}`)
      .emit('thread:created', thread);
  }

  emitThreadReplyAdded(threadId: string, reply: any) {
    this.server.emit('thread:reply:added', { threadId, reply });
  }

  // Typing indicators
  emitTypingStarted(channelId: string, userId: string, userName: string) {
    this.server
      .to(`channel:${channelId}`)
      .emit('typing:started', { userId, userName });
  }

  emitTypingStopped(channelId: string, userId: string) {
    this.server.to(`channel:${channelId}`).emit('typing:stopped', { userId });
  }

  // Voice channel events
  emitVoiceJoin(channelId: string, userId: string, peerId: string) {
    this.server
      .to(`voice:${channelId}`)
      .emit('voice:user:joined', { userId, peerId });
  }

  emitVoiceLeave(channelId: string, userId: string, peerId: string) {
    this.server
      .to(`voice:${channelId}`)
      .emit('voice:user:left', { userId, peerId });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TASK VIEWING TRACKING
  // ─────────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('task:viewing')
  handleTaskViewing(
    @MessageBody()
    data: { taskId: string; userId: string; userName: string; avatar?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { taskId, userId, userName, avatar } = data;

    if (!this.taskViewers.has(taskId)) {
      this.taskViewers.set(taskId, new Set());
    }

    const viewers = this.taskViewers.get(taskId)!;
    // Remove existing viewer with same socketId
    for (const viewer of viewers) {
      if (viewer.socketId === client.id) {
        viewers.delete(viewer);
        break;
      }
    }

    viewers.add({ userId, name: userName, avatar, socketId: client.id });
    this.broadcastTaskViewing(taskId);

    return { event: 'task:viewing:started' };
  }

  @SubscribeMessage('task:viewing:stop')
  handleTaskViewingStop(
    @MessageBody() data: { taskId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { taskId } = data;
    const viewers = this.taskViewers.get(taskId);

    if (viewers) {
      const viewer = Array.from(viewers).find((v) => v.socketId === client.id);
      if (viewer) {
        viewers.delete(viewer);
        if (viewers.size === 0) {
          this.taskViewers.delete(taskId);
        } else {
          this.broadcastTaskViewing(taskId);
        }
      }
    }

    return { event: 'task:viewing:stopped' };
  }

  private broadcastTaskViewing(taskId: string) {
    const viewers = this.taskViewers.get(taskId);
    if (!viewers) return;

    const viewersList = Array.from(viewers).map((v) => ({
      userId: v.userId,
      name: v.name,
      avatar: v.avatar,
    }));

    // Deduplicate by userId
    const uniqueViewers = Array.from(
      new Map(viewersList.map((v) => [v.userId, v])).values(),
    );

    this.server.emit('task:viewing:update', {
      taskId,
      users: uniqueViewers,
    });
  }
}
