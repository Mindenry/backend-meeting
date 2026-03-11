import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';

@Injectable()
export class RecordingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createRecording(data: {
    meetingId: string;
    fileUrl: string;
    fileSize: number;
    duration: number;
    transcription?: string;
    createdBy: string;
  }) {
    const recording = await this.prisma.meetingRecording.create({
      data: {
        ...data,
        status: 'completed',
      },
      include: {
        meeting: {
          include: {
            host: true,
            team: true,
          },
        },
      },
    });

    await this.auditService.log({
      action: 'create',
      entity: 'meeting_recording',
      entityId: recording.id,
      userId: data.createdBy,
      details: { meetingId: data.meetingId, duration: data.duration },
    });

    return recording;
  }

  async getRecordings(meetingId?: string) {
    return this.prisma.meetingRecording.findMany({
      where: meetingId ? { meetingId } : undefined,
      include: {
        meeting: {
          include: {
            host: true,
            team: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRecording(id: string) {
    const recording = await this.prisma.meetingRecording.findUnique({
      where: { id },
      include: {
        meeting: {
          include: {
            host: true,
            team: true,
            participants: true,
          },
        },
      },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    return recording;
  }

  async updateRecording(
    id: string,
    data: {
      transcription?: string;
      status?: string;
    },
  ) {
    const exists = await this.prisma.meetingRecording.findUnique({
      where: { id },
    });
    if (!exists) {
      throw new NotFoundException('Recording not found');
    }

    const recording = await this.prisma.meetingRecording.update({
      where: { id },
      data,
      include: {
        meeting: true,
      },
    });

    await this.auditService.log({
      action: 'update',
      entity: 'meeting_recording',
      entityId: id,
      details: data,
    });

    return recording;
  }

  async deleteRecording(id: string, userId: string) {
    const recording = await this.prisma.meetingRecording.findUnique({
      where: { id },
      include: { meeting: true },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    await this.prisma.meetingRecording.delete({ where: { id } });

    await this.auditService.log({
      action: 'delete',
      entity: 'meeting_recording',
      entityId: id,
      userId,
      details: { meetingId: recording.meetingId },
    });

    return { success: true };
  }
}
