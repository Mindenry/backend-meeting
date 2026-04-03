import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MeetingParticipantsService {
  constructor(private readonly prisma: PrismaService) {}

  async joinMeeting(meetingIdOrCode: string, userId: string) {
    // Try to find meeting by id first, then by meetingCode
    let meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingIdOrCode },
    });
    if (!meeting) {
      meeting = await this.prisma.meeting.findUnique({
        where: { meetingCode: meetingIdOrCode },
      });
    }

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    // Use the actual meeting id for participant record
    const actualMeetingId = meeting.id;

    // Check if already a participant
    const existing = await this.prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId: actualMeetingId,
          userId,
        },
      },
    });

    if (existing) {
      // Update if rejoining
      return this.prisma.meetingParticipant.update({
        where: {
          meetingId_userId: {
            meetingId: actualMeetingId,
            userId,
          },
        },
        data: {
          joinedAt: new Date(),
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
      });
    }

    // Create new participant
    return this.prisma.meetingParticipant.create({
      data: {
        meetingId: actualMeetingId,
        userId,
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

  async leaveMeeting(meetingIdOrCode: string, userId: string) {
    // Find meeting by id or meetingCode
    let meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingIdOrCode },
    });
    if (!meeting) {
      meeting = await this.prisma.meeting.findUnique({
        where: { meetingCode: meetingIdOrCode },
      });
    }
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    const actualMeetingId = meeting.id;

    const participant = await this.prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId: actualMeetingId,
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
          meetingId: actualMeetingId,
          userId,
        },
      },
      data: {
        leftAt: new Date(),
      },
    });
  }

  async getParticipants(meetingIdOrCode: string) {
    // Find meeting by id or meetingCode
    let meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingIdOrCode },
    });
    if (!meeting) {
      meeting = await this.prisma.meeting.findUnique({
        where: { meetingCode: meetingIdOrCode },
      });
    }

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    const actualMeetingId = meeting.id;

    return this.prisma.meetingParticipant.findMany({
      where: {
        meetingId: actualMeetingId,
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

  async updateParticipantStatus(
    meetingIdOrCode: string,
    userId: string,
    data: {
      handRaised?: boolean;
      isMuted?: boolean;
      isVideoOn?: boolean;
      isSharing?: boolean;
    },
  ) {
    // Find meeting by id or meetingCode
    let meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingIdOrCode },
    });
    if (!meeting) {
      meeting = await this.prisma.meeting.findUnique({
        where: { meetingCode: meetingIdOrCode },
      });
    }
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    const actualMeetingId = meeting.id;

    return this.prisma.meetingParticipant.update({
      where: {
        meetingId_userId: {
          meetingId: actualMeetingId,
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

  async removeParticipant(meetingIdOrCode: string, userId: string, hostId: string) {
    // Find meeting by id or meetingCode
    let meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingIdOrCode },
    });
    if (!meeting) {
      meeting = await this.prisma.meeting.findUnique({
        where: { meetingCode: meetingIdOrCode },
      });
    }

    if (!meeting || meeting.hostId !== hostId) {
      throw new BadRequestException('Only host can remove participants');
    }
    const actualMeetingId = meeting.id;

    return this.leaveMeeting(actualMeetingId, userId);
  }
}
