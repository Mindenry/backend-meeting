import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Controller('seed')
export class SeedController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async seed() {
    console.log('🌱 Starting seed...');

    // Clear existing data
    const modelsToWipe = [
      'directMessage', 'messageReaction', 'thread', 'notificationPreference',
      'notificationDigest', 'refreshToken', 'documentFolder', 'document',
      'documentVersion', 'documentPermission', 'meetingRecording',
      'reminderRecipient', 'reminder',
      'driveFileVersion', 'driveEntry', 'subtask', 'taskAttachment',
      'meetingReminder', 'workflowRun', 'workflow', 'wikiArticleVersion',
      'wikiComment', 'taskTemplate', 'taskWatcher', 'issueLink',
      'rolePermission', 'taskWorkflowStatus', 'epic', 'version', 'component',
      'sprint', 'project', 'wikiArticle', 'holiday', 'workHours', 'timeEntry',
      'meetingParticipant', 'auditLog', 'notification', 'messageRead',
      'taskActivityLog', 'taskComment', 'invite', 'message', 'channel',
      'task', 'meeting', 'announcementRead', 'announcement', 'teamMember',
      'team', 'user', 'organization'
    ];
    
    for (const model of modelsToWipe) {
      if ((this.prisma as any)[model]) {
        await (this.prisma as any)[model].deleteMany();
      }
    }
    console.log('✅ Cleared existing data');

    const hashPassword = async (password: string): Promise<string> => {
      return bcrypt.hash(password, 10);
    };

    const defaultPassword = await hashPassword('password123');
    const today = new Date();

    // Create Organization
    const organization = await this.prisma.organization.create({
      data: {
        name: 'ACME Corporation',
        domain: 'acme.com',
        allowedDomains: ['acme.com', 'acme.co.th'],
        settings: {
          allowScreenShare: true,
          maxMeetingDuration: 120,
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireNumbers: true,
          },
        },
      },
    });
    console.log('✅ Created organization');

    // Create Users
    const users = await Promise.all([
      this.prisma.user.create({
        data: {
          email: 'admin@acme.com',
          name: 'สมชาย K.',
          password: defaultPassword,
          role: 'org_owner',
          status: 'online',
          activity: 'Available',
          organizationId: organization.id,
        },
      }),
      this.prisma.user.create({
        data: {
          email: 'arisa@acme.com',
          name: 'อริสา P.',
          password: defaultPassword,
          role: 'admin',
          status: 'online',
          activity: 'In a meeting',
          organizationId: organization.id,
        },
      }),
      this.prisma.user.create({
        data: {
          email: 'jirawat@acme.com',
          name: 'จิรวัฒน์ W.',
          password: defaultPassword,
          role: 'manager',
          status: 'online',
          activity: 'Coding',
          organizationId: organization.id,
        },
      }),
    ]);
    console.log('✅ Created users');

    // Create Teams
    const engineeringTeam = await this.prisma.team.create({
      data: {
        name: 'Product Engineering',
        description: 'ทีมพัฒนา Product หลัก',
        organizationId: organization.id,
      },
    });

    const designTeam = await this.prisma.team.create({
      data: {
        name: 'Product Design',
        description: 'ทีมออกแบบ Product',
        organizationId: organization.id,
      },
    });
    console.log('✅ Created teams');

    // Create Team Members
    await Promise.all([
      this.prisma.teamMember.create({
        data: { userId: users[0].id, teamId: engineeringTeam.id, role: 'admin' },
      }),
      this.prisma.teamMember.create({
        data: { userId: users[1].id, teamId: engineeringTeam.id, role: 'member' },
      }),
      this.prisma.teamMember.create({
        data: { userId: users[2].id, teamId: designTeam.id, role: 'admin' },
      }),
    ]);
    console.log('✅ Created team members');

    // Create Tasks
    const tasks = await Promise.all([
      this.prisma.task.create({
        data: {
          title: 'แก้ไขบั๊กหน้า Login (White Screen)',
          description: 'ผู้ใช้แจ้งว่าในอุปกรณ์มือถือบางรุ่น เมื่อกดปุ่ม Login แล้วหน้าจอเป็นสีขาวค้าง',
          priority: 'urgent',
          status: 'todo',
          dueDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000),
          tags: ['bug', 'frontend', 'login'],
          assigneeId: users[1].id,
          teamId: engineeringTeam.id,
        },
      }),
      this.prisma.task.create({
        data: {
          title: 'พัฒนาระบบแนบไฟล์และ PDF Viewer',
          description: 'สร้าง Component สำหรับแสดงผลไฟล์ PDF ในหน้า Task Detail',
          priority: 'high',
          status: 'in_progress',
          dueDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
          tags: ['feature', 'frontend', 'ui'],
          assigneeId: users[2].id,
          teamId: engineeringTeam.id,
        },
      }),
    ]);
    console.log('✅ Created tasks');

    return {
      success: true,
      message: 'Database seeded successfully',
      data: {
        organization: organization.name,
        users: users.length,
        teams: 2,
        tasks: tasks.length,
        login: {
          email: 'admin@acme.com',
          password: 'password123',
        },
      },
    };
  }
}
