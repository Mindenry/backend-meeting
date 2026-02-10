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

interface MeetingParticipant {
  peerId: string;
  name: string;
  socketId: string;
  state: {
    isMuted: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
    isHandRaised: boolean;
  };
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track participants in each meeting
  private meetingParticipants: Map<string, MeetingParticipant[]> = new Map();
  // Map socket IDs to meeting IDs for cleanup on disconnect
  private socketMeetings: Map<string, { meetingId: string; peerId: string }> = new Map();
  // Online presence: socketId -> { userId, name }
  private onlineUsers: Map<string, { userId: string; name: string }> = new Map();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    // Clean up meeting participation on disconnect
    const meetingInfo = this.socketMeetings.get(client.id);
    if (meetingInfo) {
      this.removeMeetingParticipant(meetingInfo.meetingId, meetingInfo.peerId, client);
      this.socketMeetings.delete(client.id);
    }

    // Clean up presence
    if (this.onlineUsers.has(client.id)) {
      this.onlineUsers.delete(client.id);
      this.broadcastPresence();
    }
  }

  private removeMeetingParticipant(meetingId: string, peerId: string, client: Socket) {
    const participants = this.meetingParticipants.get(meetingId) || [];
    const updated = participants.filter(p => p.peerId !== peerId);
    this.meetingParticipants.set(meetingId, updated);

    // Notify others in the meeting room
    client.to(`meeting:${meetingId}`).emit('meeting:participant:left', { peerId });
    client.leave(`meeting:${meetingId}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MEETING ROOM SIGNALING
  // ─────────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('meeting:join')
  handleMeetingJoin(
    @MessageBody() data: { meetingId: string; peerId: string; peerName: string; state: any },
    @ConnectedSocket() client: Socket,
  ) {
    const { meetingId, peerId, peerName, state } = data;

    // Join the meeting room
    client.join(`meeting:${meetingId}`);

    // Track this socket's meeting
    this.socketMeetings.set(client.id, { meetingId, peerId });

    // Get existing participants
    const participants = this.meetingParticipants.get(meetingId) || [];

    // Add new participant
    const newParticipant: MeetingParticipant = {
      peerId,
      name: peerName,
      socketId: client.id,
      state: state || { isMuted: false, isCameraOn: true, isScreenSharing: false, isHandRaised: false },
    };
    participants.push(newParticipant);
    this.meetingParticipants.set(meetingId, participants);

    // Send existing participants to the new joiner
    const existingParticipants = participants
      .filter(p => p.peerId !== peerId)
      .map(p => ({ peerId: p.peerId, name: p.name, state: p.state }));

    client.emit('meeting:participants', existingParticipants);

    // Notify others about new participant
    client.to(`meeting:${meetingId}`).emit('meeting:participant:joined', {
      peerId,
      name: peerName,
      state: newParticipant.state,
    });

    // Broadcast to all clients (for Meetings page)
    this.broadcastActiveRooms();

    return { event: 'meeting:joined', meetingId, participantCount: participants.length };
  }

  @SubscribeMessage('meeting:leave')
  handleMeetingLeave(
    @MessageBody() data: { meetingId: string; peerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.removeMeetingParticipant(data.meetingId, data.peerId, client);
    this.socketMeetings.delete(client.id);

    // Broadcast to all clients that someone left (for Meetings page)
    this.broadcastActiveRooms();

    return { event: 'meeting:left', meetingId: data.meetingId };
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
    @MessageBody() data: { userId: string; name: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.onlineUsers.set(client.id, { userId: data.userId, name: data.name });
    this.broadcastPresence();
    return { event: 'presence:registered' };
  }

  @SubscribeMessage('presence:get')
  handlePresenceGet(@ConnectedSocket() client: Socket) {
    const onlineList = this.getOnlineUsersData();
    client.emit('presence:update', onlineList);
    return { event: 'presence:sent' };
  }

  private getOnlineUsersData(): Array<{ userId: string; name: string }> {
    // Deduplicate by userId (same user may have multiple sockets)
    const seen = new Map<string, { userId: string; name: string }>();
    for (const [, info] of this.onlineUsers) {
      seen.set(info.userId, info);
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
  handleDmSend(
    @MessageBody() data: { id: string; text: string; senderId: string; senderName: string; receiverId: string; createdAt: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Find all sockets belonging to the receiver
    for (const [socketId, userInfo] of this.onlineUsers) {
      if (userInfo.userId === data.receiverId) {
        this.server.to(socketId).emit('dm:message', data);
      }
    }
    return { event: 'dm:sent' };
  }

  private getActiveRoomsData() {
    const rooms: Array<{
      roomId: string;
      name: string;
      participants: Array<{ peerId: string; name: string }>;
      createdAt: Date;
    }> = [];

    for (const [meetingId, participants] of this.meetingParticipants) {
      if (participants.length > 0) {
        rooms.push({
          roomId: meetingId,
          name: meetingId === 'quick-huddle' ? 'Quick Huddle' : `Meeting ${meetingId.slice(0, 8)}`,
          participants: participants.map(p => ({ peerId: p.peerId, name: p.name })),
          createdAt: new Date(),
        });
      }
    }

    return rooms;
  }

  private broadcastActiveRooms() {
    const rooms = this.getActiveRoomsData();
    this.server.emit('rooms:active', rooms);
  }

  @SubscribeMessage('meeting:participant:update')
  handleParticipantUpdate(
    @MessageBody() data: { meetingId: string; peerId: string; name: string; state: any },
    @ConnectedSocket() client: Socket,
  ) {
    const { meetingId, peerId, name, state } = data;

    // Update stored state
    const participants = this.meetingParticipants.get(meetingId) || [];
    const participant = participants.find(p => p.peerId === peerId);
    if (participant) {
      participant.state = state;
    }

    // Broadcast to others in the meeting
    client.to(`meeting:${meetingId}`).emit('meeting:participant:update', { peerId, name, state });
    return { event: 'updated' };
  }

  @SubscribeMessage('meeting:participant:speaking')
  handleSpeakingUpdate(
    @MessageBody() data: { meetingId: string; peerId: string; isSpeaking: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast speaking state to others in the meeting
    client.to(`meeting:${data.meetingId}`).emit('meeting:participant:speaking', {
      peerId: data.peerId,
      isSpeaking: data.isSpeaking,
    });
    return { event: 'speaking:updated' };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // WEBRTC SIGNALING
  // ─────────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('webrtc:offer')
  handleWebRTCOffer(
    @MessageBody() data: { to: string; name: string; offer: RTCSessionDescriptionInit },
    @ConnectedSocket() client: Socket,
  ) {
    // Find the target socket
    const targetSocket = this.findSocketByPeerId(data.to);
    if (targetSocket) {
      this.server.to(targetSocket).emit('webrtc:offer', {
        from: this.getPeerIdBySocket(client.id),
        name: data.name,
        offer: data.offer,
      });
    }
    return { event: 'offer:sent' };
  }

  @SubscribeMessage('webrtc:answer')
  handleWebRTCAnswer(
    @MessageBody() data: { to: string; answer: RTCSessionDescriptionInit },
    @ConnectedSocket() client: Socket,
  ) {
    const targetSocket = this.findSocketByPeerId(data.to);
    if (targetSocket) {
      this.server.to(targetSocket).emit('webrtc:answer', {
        from: this.getPeerIdBySocket(client.id),
        answer: data.answer,
      });
    }
    return { event: 'answer:sent' };
  }

  @SubscribeMessage('webrtc:ice-candidate')
  handleICECandidate(
    @MessageBody() data: { to: string; candidate: RTCIceCandidateInit },
    @ConnectedSocket() client: Socket,
  ) {
    const targetSocket = this.findSocketByPeerId(data.to);
    if (targetSocket) {
      this.server.to(targetSocket).emit('webrtc:ice-candidate', {
        from: this.getPeerIdBySocket(client.id),
        candidate: data.candidate,
      });
    }
    return { event: 'ice:sent' };
  }

  private findSocketByPeerId(peerId: string): string | null {
    for (const [meetingId, participants] of this.meetingParticipants) {
      const participant = participants.find(p => p.peerId === peerId);
      if (participant) {
        return participant.socketId;
      }
    }
    return null;
  }

  private getPeerIdBySocket(socketId: string): string | null {
    const info = this.socketMeetings.get(socketId);
    return info?.peerId || null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ROOM MANAGEMENT (existing)
  // ─────────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('join-room')
  handleJoinRoom(@MessageBody() room: string, @ConnectedSocket() client: Socket) {
    client.join(room);
    return { event: 'joined', room };
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(@MessageBody() room: string, @ConnectedSocket() client: Socket) {
    client.leave(room);
    return { event: 'left', room };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MEETING CHAT
  // ─────────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('meeting:chat:send')
  handleMeetingChat(
    @MessageBody() data: { meetingId: string; message: { id: string; sender: string; text: string; time: string } },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast chat message to all in the meeting
    this.server.to(`meeting:${data.meetingId}`).emit('meeting:chat:message', data.message);
    return { event: 'chat:sent' };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EXISTING EVENTS (kept from original)
  // ─────────────────────────────────────────────────────────────────────────────

  // Meeting events
  emitMeetingCreated(meeting: any) {
    this.server.emit('meeting:created', meeting);
  }

  emitMeetingUpdated(meeting: any) {
    this.server.emit('meeting:updated', meeting);
  }

  emitMeetingDeleted(meetingId: string) {
    this.server.emit('meeting:deleted', { id: meetingId });
  }

  // Task events
  emitTaskCreated(task: any) {
    this.server.emit('task:created', task);
  }

  emitTaskUpdated(task: any) {
    this.server.emit('task:updated', task);
  }

  emitTaskDeleted(taskId: string) {
    this.server.emit('task:deleted', { id: taskId });
  }

  // Team events
  emitTeamCreated(team: any) {
    this.server.emit('team:created', team);
  }

  emitTeamUpdated(team: any) {
    this.server.emit('team:updated', team);
  }

  emitTeamMemberAdded(teamId: string, member: any) {
    this.server.to(`team:${teamId}`).emit('team:member:added', member);
  }

  // User events
  emitUserStatusChanged(userId: string, status: string) {
    this.server.emit('user:status:changed', { userId, status });
  }

  emitUserRoomChanged(userId: string, room: string | null) {
    this.server.emit('user:room:changed', { userId, room });
  }

  // Channel events
  emitChannelCreated(channel: any) {
    this.server.emit('channel:created', channel);
  }

  emitChannelUpdated(channel: any) {
    this.server.emit('channel:updated', channel);
  }

  emitChannelDeleted(channelId: string) {
    this.server.emit('channel:deleted', { id: channelId });
  }

  // Message events
  emitMessageCreated(message: any) {
    this.server.emit('message:created', message);
    this.server.to(`channel:${message.channelId}`).emit('message:created', message);
  }

  emitMessageUpdated(message: any) {
    this.server.emit('message:updated', message);
  }

  emitMessageDeleted(messageId: string, channelId: string) {
    this.server.emit('message:deleted', { id: messageId, channelId });
  }
}
