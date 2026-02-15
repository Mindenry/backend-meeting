import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { verifyPassword } from '../auth/password';

@Injectable()
export class MeetingParticipantsService {
  constructor(private readonly prisma: PrismaService) {}

  async joinMeeting(
    meetingId: string,
    userId: string,
    password?: string,
    skipWaitingRoom: boolean = false,
  ) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    // Security checks (skip for host)
    if (meeting.hostId !== userId && !skipWaitingRoom) {
      if (meeting.isLocked) {
        throw new BadRequestException('Meeting is locked');
      }

      if (meeting.password && (!password || !verifyPassword(password, meeting.password))) {
        throw new BadRequestException('Invalid meeting password');
      }
    }

    // Check if already a participant
    const existing = await this.prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId,
          userId,
        },
      },
    });

    if (existing) {
      // Update if rejoining
      return this.prisma.meetingParticipant.update({
        where: {
          meetingId_userId: {
            meetingId,
            userId,
          },
        },
        data: {
          joinedAt: new Date(),
          leftAt: null,
          waitingRoom: meeting.waitingRoom && !skipWaitingRoom && meeting.hostId !== userId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      });
    }

    // Create new participant
    return this.prisma.meetingParticipant.create({
      data: {
        meetingId,
        userId,
        waitingRoom: meeting.waitingRoom && !skipWaitingRoom && meeting.hostId !== userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  }

  async leaveMeeting(meetingId: string, userId: string) {
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    return this.prisma.meetingParticipant.update({
      where: {
        meetingId_userId: {
          meetingId,
          userId,
        },
      },
      data: {
        leftAt: new Date(),
      },
    });
  }

  async getParticipants(meetingId: string, includeWaitingRoom: boolean = false) {
    return this.prisma.meetingParticipant.findMany({
      where: {
        meetingId,
        leftAt: null,
        waitingRoom: includeWaitingRoom ? undefined : false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });
  }

  async getWaitingRoom(meetingId: string) {
    return this.prisma.meetingParticipant.findMany({
      where: {
        meetingId,
        waitingRoom: true,
        leftAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });
  }

  async admitParticipant(meetingId: string, userId: string) {
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    if (!participant.waitingRoom) {
      throw new BadRequestException('Participant is not in waiting room');
    }

    return this.prisma.meetingParticipant.update({
      where: {
        meetingId_userId: {
          meetingId,
          userId,
        },
      },
      data: {
        waitingRoom: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  }

  async denyParticipant(meetingId: string, userId: string) {
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    return this.prisma.meetingParticipant.update({
      where: {
        meetingId_userId: {
          meetingId,
          userId,
        },
      },
      data: {
        leftAt: new Date(),
      },
    });
  }

  async updateParticipantStatus(
    meetingId: string,
    userId: string,
    data: {
      handRaised?: boolean;
      isMuted?: boolean;
      isVideoOn?: boolean;
      isSharing?: boolean;
    },
  ) {
    return this.prisma.meetingParticipant.update({
      where: {
        meetingId_userId: {
          meetingId,
          userId,
        },
      },
      data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  }

  async muteAll(meetingId: string, hostId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting || meeting.hostId !== hostId) {
      throw new BadRequestException('Only host can mute all participants');
    }

    await this.prisma.meetingParticipant.updateMany({
      where: {
        meetingId,
        userId: { not: hostId },
        leftAt: null,
      },
      data: {
        isMuted: true,
      },
    });

    return { success: true };
  }

  async removeParticipant(meetingId: string, userId: string, hostId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting || meeting.hostId !== hostId) {
      throw new BadRequestException('Only host can remove participants');
    }

    return this.leaveMeeting(meetingId, userId);
  }
}

