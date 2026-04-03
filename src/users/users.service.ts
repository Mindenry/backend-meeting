import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {}

  findAll(includeSystem = false, page?: number, limit = 50) {
    const skip = page ? (page - 1) * limit : undefined;
    
    return this.prisma.user.findMany({
      where: includeSystem
        ? undefined
        : {
            role: {
              not: 'system',
            },
          },
      select: {
        id: true,
        email: true,
        name: true,
        displayName: true,
        role: true,
        status: true,
        activity: true,
        avatar: true,
        department: true,
        position: true,
        isActive: true,
        organizationId: true,
        managerId: true,
        createdAt: true,
        updatedAt: true,
      },
      ...(skip !== undefined ? { skip, take: limit } : {}),
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    email: string;
    name: string;
    organizationId?: string;
    password?: string;
    role?: string;
  }) {
    // Get default organization if not provided
    let organizationId = data.organizationId;
    if (!organizationId) {
      const defaultOrg = await this.prisma.organization.findFirst();
      if (!defaultOrg) {
        throw new Error(
          'No organization found. Please create an organization first.',
        );
      }
      organizationId = defaultOrg.id;
    }

    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: data.password,
        role: data.role || 'employee',
        organizationId,
      } as any, // Cast to any or appropriate type if schema is strict
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({ where: { id }, data });
  }

  async updateStatus(id: string, data: { status?: string; activity?: string }) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('User not found');
    }
    const user = await this.prisma.user.update({
      where: { id },
      data,
    });
    if (data.status) {
      this.eventsGateway.emitUserStatusChanged(id, data.status);
    }
    return user;
  }

  async remove(id: string) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('User not found');
    }

    // Delete related records first to handle foreign key constraints
    await this.prisma.$transaction([
      // Delete team memberships
      this.prisma.teamMember.deleteMany({ where: { userId: id } }),
      // Delete meeting participants
      this.prisma.meetingParticipant.deleteMany({ where: { userId: id } }),
      // Delete meeting reminders
      this.prisma.meetingReminder.deleteMany({ where: { userId: id } }),
      // Delete reminders created by user
      this.prisma.reminder.deleteMany({ where: { createdBy: id } }),
      // Delete reminder recipients
      this.prisma.reminderRecipient.deleteMany({ where: { userId: id } }),
      // Delete notifications
      this.prisma.notification.deleteMany({ where: { userId: id } }),
      // Delete notification preferences
      this.prisma.notificationPreference.deleteMany({ where: { userId: id } }),
      // Delete notification digests
      this.prisma.notificationDigest.deleteMany({ where: { userId: id } }),
      // Delete refresh tokens
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
      // Delete time entries
      this.prisma.timeEntry.deleteMany({ where: { userId: id } }),
      // Delete work hours
      this.prisma.workHours.deleteMany({ where: { userId: id } }),
      // Delete messages sent by user
      this.prisma.message.deleteMany({ where: { senderId: id } }),
      // Delete direct messages
      this.prisma.directMessage.deleteMany({ where: { senderId: id } }),
      this.prisma.directMessage.deleteMany({ where: { receiverId: id } }),
      // Delete message reads
      this.prisma.messageRead.deleteMany({ where: { userId: id } }),
      // Delete message reactions
      this.prisma.messageReaction.deleteMany({ where: { userId: id } }),
      // Delete task assignments
      this.prisma.task.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } }),
      this.prisma.task.updateMany({ where: { reporterId: id }, data: { reporterId: null } }),
      // Delete task comments
      this.prisma.taskComment.deleteMany({ where: { userId: id } }),
      // Delete task activity logs
      this.prisma.taskActivityLog.deleteMany({ where: { userId: id } }),
      // Delete task attachments
      this.prisma.taskAttachment.deleteMany({ where: { userId: id } }),
      // Delete task watchers
      this.prisma.taskWatcher.deleteMany({ where: { userId: id } }),
      // Delete invites created by user
      this.prisma.invite.deleteMany({ where: { invitedBy: id } }),
      // Delete audit logs
      this.prisma.auditLog.deleteMany({ where: { userId: id } }),
      // Delete document permissions
      this.prisma.documentPermission.deleteMany({ where: { userId: id } }),
      // Delete drive permissions
      this.prisma.drivePermission.deleteMany({ where: { userId: id } }),
      // Delete drive file versions
      this.prisma.driveFileVersion.deleteMany({ where: { createdById: id } }),
      // Delete drive entries created by user
      this.prisma.driveEntry.deleteMany({ where: { createdById: id } }),
      // Delete wiki comments
      this.prisma.wikiComment.deleteMany({ where: { createdBy: id } }),
      // Delete wiki article versions
      this.prisma.wikiArticleVersion.deleteMany({ where: { createdBy: id } }),
      // Delete announcement reads
      this.prisma.announcementRead.deleteMany({ where: { userId: id } }),
      // Finally delete the user
      this.prisma.user.delete({ where: { id } }),
    ]);

    return { success: true };
  }

  async changePassword(id: string, passwords: any) {
    const { currentPassword, newPassword } = passwords;

    if (!currentPassword || !newPassword) {
      throw new BadRequestException(
        'รหัสผ่านปัจจุบันและรหัสผ่านใหม่จำเป็นต้องระบุ',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    if (user.password) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        throw new BadRequestException('รหัสผ่านปัจจุบันไม่ถูกต้อง');
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return { success: true };
  }
}
