import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMeetingMinutesDto, UpdateMeetingMinutesDto } from './dto/create-meeting-minutes.dto';

@Injectable()
export class MeetingMinutesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateMeetingMinutesDto) {
    // Verify meeting exists
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: dto.meetingId },
    });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return this.prisma.meetingMinutes.create({
      data: {
        meetingId: dto.meetingId,
        title: dto.title,
        content: dto.content,
        actionItems: dto.actionItems,
        decisions: dto.decisions,
        attendees: dto.attendees || [],
        createdBy: userId,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }

  async findByMeeting(meetingId: string) {
    return this.prisma.meetingMinutes.findMany({
      where: { meetingId },
      include: {
        creator: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const minutes = await this.prisma.meetingMinutes.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        meeting: {
          select: { id: true, title: true },
        },
      },
    });
    if (!minutes) {
      throw new NotFoundException('Meeting minutes not found');
    }
    return minutes;
  }

  async update(userId: string, id: string, dto: UpdateMeetingMinutesDto) {
    const existing = await this.prisma.meetingMinutes.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Meeting minutes not found');
    }

    // Only creator can update
    if (existing.createdBy !== userId) {
      throw new ForbiddenException('Only the creator can update meeting minutes');
    }

    // Build update data, only include defined fields
    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.actionItems !== undefined) updateData.actionItems = dto.actionItems;
    if (dto.decisions !== undefined) updateData.decisions = dto.decisions;
    if (dto.attendees !== undefined) updateData.attendees = dto.attendees;

    return this.prisma.meetingMinutes.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.meetingMinutes.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Meeting minutes not found');
    }

    // Only creator can delete
    if (existing.createdBy !== userId) {
      throw new ForbiddenException('Only the creator can delete meeting minutes');
    }

    await this.prisma.meetingMinutes.delete({ where: { id } });
    return { success: true };
  }
}
