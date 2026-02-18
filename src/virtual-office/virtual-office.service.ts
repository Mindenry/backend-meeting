import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { AuditService } from '../common/audit.service';

@Injectable()
export class VirtualOfficeService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly auditService: AuditService,
  ) {}

  // Virtual Room Management
  async createRoom(data: {
    name: string;
    description?: string;
    type?: string;
    capacity?: number;
    isPrivate?: boolean;
    teamId?: string;
    createdBy: string;
  }) {
    const room = await this.prisma.virtualRoom.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type || 'office',
        capacity: data.capacity || 50,
        isPrivate: data.isPrivate ?? false,
        teamId: data.teamId,
        createdBy: data.createdBy,
      },
      include: {
        team: true,
        presences: {
          include: {
            user: true,
          },
        },
      },
    });

    await this.auditService.log({
      action: 'create',
      entity: 'virtualroom',
      entityId: room.id,
      userId: data.createdBy,
    });

    return room;
  }

  async findAllRooms(params?: {
    teamId?: string;
    type?: string;
  }) {
    return this.prisma.virtualRoom.findMany({
      where: {
        teamId: params?.teamId || undefined,
        type: params?.type || undefined,
      },
      include: {
        team: true,
        presences: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                status: true,
                activity: true,
              },
            },
          },
        },
        _count: {
          select: {
            presences: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneRoom(id: string) {
    const room = await this.prisma.virtualRoom.findUnique({
      where: { id },
      include: {
        team: true,
        presences: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
                activity: true,
              },
            },
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Virtual room not found');
    }

    return room;
  }

  async updateRoom(
    id: string,
    data: {
      name?: string;
      description?: string;
      capacity?: number;
      isPrivate?: boolean;
    },
  ) {
    return this.prisma.virtualRoom.update({
      where: { id },
      data,
    });
  }

  async deleteRoom(id: string, userId: string) {
    await this.prisma.virtualRoom.delete({
      where: { id },
    });

    await this.auditService.log({
      action: 'delete',
      entity: 'virtualroom',
      entityId: id,
      userId,
    });
  }

  // Presence Management
  async joinRoom(roomId: string, userId: string, position?: { x: number; y: number }) {
    // Check if already in room
    const existing = await this.prisma.virtualRoomPresence.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (existing) {
      // Update last seen
      return this.prisma.virtualRoomPresence.update({
        where: {
          roomId_userId: {
            roomId,
            userId,
          },
        },
        data: {
          lastSeen: new Date(),
          status: 'active',
          position: position || undefined,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              status: true,
              activity: true,
            },
          },
        },
      });
    }

    // Check room capacity
    const room = await this.findOneRoom(roomId);
    const currentCount = room.presences.length;
    if (currentCount >= room.capacity) {
      throw new Error('Room is at full capacity');
    }

    const presence = await this.prisma.virtualRoomPresence.create({
      data: {
        roomId,
        userId,
        position: position || undefined,
        status: 'active',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            status: true,
            activity: true,
          },
        },
      },
    });

    // Update user's current room
    await this.prisma.user.update({
      where: { id: userId },
      data: { currentRoom: roomId },
    });

    // Broadcast to room
    this.eventsGateway.server
      .to(`room:${roomId}`)
      .emit('presence:joined', presence);

    return presence;
  }

  async leaveRoom(roomId: string, userId: string) {
    const presence = await this.prisma.virtualRoomPresence.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (presence) {
      await this.prisma.virtualRoomPresence.delete({
        where: {
          roomId_userId: {
            roomId,
            userId,
          },
        },
      });

      // Update user's current room
      await this.prisma.user.update({
        where: { id: userId },
        data: { currentRoom: null },
      });

      // Broadcast to room
      this.eventsGateway.server
        .to(`room:${roomId}`)
        .emit('presence:left', { userId, roomId });
    }

    return { success: true };
  }

  async updatePresence(
    roomId: string,
    userId: string,
    data: {
      position?: { x: number; y: number };
      status?: 'active' | 'away' | 'busy';
    },
  ) {
    const presence = await this.prisma.virtualRoomPresence.update({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
      data: {
        position: data.position || undefined,
        status: data.status || 'active',
        lastSeen: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            status: true,
            activity: true,
          },
        },
      },
    });

    // Broadcast update
    this.eventsGateway.server
      .to(`room:${roomId}`)
      .emit('presence:updated', presence);

    return presence;
  }

  async getRoomPresences(roomId: string) {
    return this.prisma.virtualRoomPresence.findMany({
      where: { roomId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            activity: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  // Get user's current room
  async getUserCurrentRoom(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentRoom: true },
    });

    if (!user?.currentRoom) {
      return null;
    }

    return this.findOneRoom(user.currentRoom);
  }

  // Quick huddle (create temporary room)
  async createQuickHuddle(teamId: string, creatorId: string, participantIds: string[]) {
    const room = await this.createRoom({
      name: `Quick Huddle - ${new Date().toLocaleTimeString()}`,
      type: 'meeting',
      capacity: participantIds.length + 1,
      isPrivate: true,
      teamId,
      createdBy: creatorId,
    });

    // Add all participants
    for (const participantId of participantIds) {
      await this.joinRoom(room.id, participantId);
    }

    await this.joinRoom(room.id, creatorId);

    return room;
  }
}
