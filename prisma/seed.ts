import { PrismaClient } from '@prisma/client';

// Simple password hash function (using bcrypt if available, otherwise use a placeholder)
// In production, always use bcrypt
let bcrypt: any;
try {
  bcrypt = require('bcrypt');
} catch (e) {
  // Fallback if bcrypt is not installed
  console.warn('⚠️  bcrypt not found, using placeholder hash. Please install: npm install bcrypt @types/bcrypt');
  bcrypt = {
    hash: async (password: string, rounds: number) => {
      // Placeholder hash - NOT SECURE, only for development
      return `$2b$${rounds}$placeholder${Buffer.from(password).toString('base64')}`;
    },
  };
}

const prisma = new PrismaClient();

// Helper function to generate meeting code
function generateMeetingCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper function to generate invite token
function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function main() {
  console.log('🌱 Starting comprehensive seed...');

  // Clear existing data (in correct order to respect foreign keys)
  console.log('🧹 Clearing existing data...');
  await prisma.messageRead.deleteMany();
  await prisma.message.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskActivityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.meetingParticipant.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // Hash password helper
  const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, 10);
  };

  // 1. Create Organization
  console.log('📦 Creating organization...');
  const organization = await prisma.organization.create({
    data: {
      name: 'ACME Corporation',
      domain: 'acme.com',
      allowedDomains: ['acme.com', 'acme.co.th'],
      settings: {
        requireWaitingRoom: true,
        allowScreenShare: true,
        maxMeetingDuration: 120, // minutes
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireNumbers: true,
        },
      },
    },
  });
  console.log(`✅ Created organization: ${organization.name}`);

  // 2. Create Users with passwords
  console.log('👥 Creating users...');
  const defaultPassword = await hashPassword('password123');
  
  const users = await Promise.all([
    prisma.user.create({
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
    prisma.user.create({
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
    prisma.user.create({
      data: {
        email: 'jirawat@acme.com',
        name: 'จิรวัฒน์ W.',
        password: defaultPassword,
        role: 'manager',
        status: 'busy',
        activity: 'Working on tasks',
        organizationId: organization.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'pim@acme.com',
        name: 'พิมพ์ L.',
        password: defaultPassword,
        role: 'employee',
        status: 'online',
        activity: 'Available',
        organizationId: organization.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'thana@acme.com',
        name: 'ธนา S.',
        password: defaultPassword,
        role: 'employee',
        status: 'away',
        activity: 'Away',
        organizationId: organization.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'napa@acme.com',
        name: 'นภา M.',
        password: defaultPassword,
        role: 'employee',
        status: 'online',
        activity: 'Available',
        organizationId: organization.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'wipa@acme.com',
        name: 'วิภา T.',
        password: defaultPassword,
        role: 'manager',
        status: 'online',
        activity: 'Available',
        organizationId: organization.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'kitti@acme.com',
        name: 'กิตติ R.',
        password: defaultPassword,
        role: 'employee',
        status: 'offline',
        activity: 'Offline',
        organizationId: organization.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'preeya@acme.com',
        name: 'ปรียา S.',
        password: defaultPassword,
        role: 'employee',
        status: 'online',
        activity: 'Available',
        organizationId: organization.id,
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // 3. Create Teams
  console.log('👨‍👩‍👧‍👦 Creating teams...');
  const engineeringTeam = await prisma.team.create({
    data: {
      name: 'Engineering',
      description: 'Software engineering and development team',
      organizationId: organization.id,
    },
  });

  const designTeam = await prisma.team.create({
    data: {
      name: 'Design',
      description: 'UI/UX design and creative team',
      organizationId: organization.id,
    },
  });

  const operationsTeam = await prisma.team.create({
    data: {
      name: 'Operations',
      description: 'Operations and support team',
      organizationId: organization.id,
    },
  });

  console.log('✅ Created 3 teams');

  // 4. Add team members
  console.log('➕ Adding team members...');
  await prisma.teamMember.createMany({
    data: [
      { userId: users[0].id, teamId: engineeringTeam.id, role: 'admin' },
      { userId: users[2].id, teamId: engineeringTeam.id, role: 'member' },
      { userId: users[4].id, teamId: engineeringTeam.id, role: 'member' },
      { userId: users[5].id, teamId: engineeringTeam.id, role: 'member' },
      { userId: users[1].id, teamId: designTeam.id, role: 'admin' },
      { userId: users[3].id, teamId: designTeam.id, role: 'member' },
      { userId: users[6].id, teamId: operationsTeam.id, role: 'admin' },
      { userId: users[7].id, teamId: operationsTeam.id, role: 'member' },
      { userId: users[8].id, teamId: operationsTeam.id, role: 'member' },
    ],
  });
  console.log('✅ Added team members');

  // 5. Create Invites
  console.log('📧 Creating invites...');
  const invites = await Promise.all([
    prisma.invite.create({
      data: {
        email: 'newuser1@acme.com',
        token: generateToken(),
        role: 'employee',
        invitedBy: users[0].id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        teamId: engineeringTeam.id,
        organizationId: organization.id,
      },
    }),
    prisma.invite.create({
      data: {
        email: 'newuser2@acme.com',
        token: generateToken(),
        role: 'employee',
        invitedBy: users[1].id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teamId: designTeam.id,
        organizationId: organization.id,
      },
    }),
    prisma.invite.create({
      data: {
        email: 'expired@acme.com',
        token: generateToken(),
        role: 'employee',
        invitedBy: users[0].id,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
        organizationId: organization.id,
      },
    }),
  ]);
  console.log(`✅ Created ${invites.length} invites`);

  // 6. Create Meetings with meeting codes
  console.log('📅 Creating meetings...');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const meetings = await Promise.all([
    prisma.meeting.create({
      data: {
        title: 'Sprint Planning',
        description: 'Weekly sprint planning meeting',
        startTime: new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10:00 AM today
        endTime: new Date(today.getTime() + 11 * 60 * 60 * 1000), // 11:00 AM
        meetingCode: generateMeetingCode(),
        waitingRoom: true,
        allowScreenShare: true,
        isLocked: false,
        status: 'scheduled',
        hostId: users[0].id,
        teamId: engineeringTeam.id,
      },
    }),
    prisma.meeting.create({
      data: {
        title: 'Design Review',
        description: 'Review new design mockups',
        startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000), // 2:00 PM today
        endTime: new Date(today.getTime() + 14 * 60 * 60 * 1000 + 45 * 60 * 1000), // 2:45 PM
        meetingCode: generateMeetingCode(),
        waitingRoom: false,
        allowScreenShare: true,
        isLocked: false,
        status: 'scheduled',
        hostId: users[1].id,
        teamId: designTeam.id,
      },
    }),
    prisma.meeting.create({
      data: {
        title: '1-on-1 with Manager',
        description: 'Weekly 1-on-1',
        startTime: new Date(today.getTime() + 16 * 60 * 60 * 1000 + 30 * 60 * 1000), // 4:30 PM today
        endTime: new Date(today.getTime() + 17 * 60 * 60 * 1000), // 5:00 PM
        meetingCode: generateMeetingCode(),
        waitingRoom: false,
        allowScreenShare: false,
        isLocked: false,
        status: 'scheduled',
        hostId: users[0].id,
        teamId: null,
      },
    }),
    prisma.meeting.create({
      data: {
        title: 'Daily Standup',
        description: 'Daily team standup',
        startTime: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // 10:00 AM yesterday
        endTime: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000 + 15 * 60 * 1000), // 10:15 AM
        meetingCode: generateMeetingCode(),
        waitingRoom: false,
        allowScreenShare: false,
        isLocked: false,
        status: 'ended',
        actualStartTime: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
        actualEndTime: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000 + 15 * 60 * 1000),
        summary: 'Discussed sprint progress. All tasks on track.',
        hostId: users[0].id,
        teamId: engineeringTeam.id,
      },
    }),
    prisma.meeting.create({
      data: {
        title: 'Client Presentation',
        description: 'Present new features to client',
        startTime: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000), // 3:00 PM yesterday
        endTime: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000), // 4:00 PM
        meetingCode: generateMeetingCode(),
        waitingRoom: true,
        allowScreenShare: true,
        isLocked: false,
        status: 'ended',
        actualStartTime: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000),
        actualEndTime: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000),
        summary: 'Presented new features. Client feedback positive.',
        hostId: users[1].id,
        teamId: designTeam.id,
      },
    }),
    prisma.meeting.create({
      data: {
        title: 'Live Meeting',
        description: 'Currently ongoing meeting',
        startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9:00 AM today
        endTime: new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10:00 AM
        meetingCode: generateMeetingCode(),
        waitingRoom: true,
        allowScreenShare: true,
        isLocked: false,
        status: 'live',
        actualStartTime: new Date(today.getTime() + 9 * 60 * 60 * 1000),
        hostId: users[2].id,
        teamId: engineeringTeam.id,
      },
    }),
  ]);

  console.log(`✅ Created ${meetings.length} meetings`);

  // 7. Create Meeting Participants
  console.log('👥 Creating meeting participants...');
  const participants = await Promise.all([
    // Participants for ended meeting
    prisma.meetingParticipant.create({
      data: {
        meetingId: meetings[3].id, // Daily Standup
        userId: users[0].id,
        joinedAt: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
        leftAt: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000 + 15 * 60 * 1000),
        handRaised: false,
        isMuted: false,
        isVideoOn: true,
        isSharing: false,
        waitingRoom: false,
      },
    }),
    prisma.meetingParticipant.create({
      data: {
        meetingId: meetings[3].id,
        userId: users[2].id,
        joinedAt: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000 + 1 * 60 * 1000),
        leftAt: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000 + 15 * 60 * 1000),
        handRaised: true,
        isMuted: false,
        isVideoOn: true,
        isSharing: false,
        waitingRoom: false,
      },
    }),
    // Participants for live meeting
    prisma.meetingParticipant.create({
      data: {
        meetingId: meetings[5].id, // Live Meeting
        userId: users[2].id,
        joinedAt: new Date(today.getTime() + 9 * 60 * 60 * 1000),
        handRaised: false,
        isMuted: false,
        isVideoOn: true,
        isSharing: true,
        waitingRoom: false,
      },
    }),
    prisma.meetingParticipant.create({
      data: {
        meetingId: meetings[5].id,
        userId: users[4].id,
        joinedAt: new Date(today.getTime() + 9 * 60 * 60 * 1000 + 2 * 60 * 1000),
        handRaised: false,
        isMuted: true,
        isVideoOn: false,
        isSharing: false,
        waitingRoom: false,
      },
    }),
    // Waiting room participants
    prisma.meetingParticipant.create({
      data: {
        meetingId: meetings[5].id,
        userId: users[5].id,
        joinedAt: new Date(today.getTime() + 9 * 60 * 60 * 1000 + 5 * 60 * 1000),
        handRaised: false,
        isMuted: true,
        isVideoOn: false,
        isSharing: false,
        waitingRoom: true, // In waiting room
      },
    }),
  ]);
  console.log(`✅ Created ${participants.length} meeting participants`);

  // 8. Create Tasks
  console.log('✅ Creating tasks...');
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Update API documentation',
        description: 'Update API documentation for meeting endpoints',
        priority: 'medium',
        status: 'todo',
        dueDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        tags: ['docs', 'api'],
        assigneeId: users[1].id,
        teamId: engineeringTeam.id,
        meetingId: meetings[0].id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Fix Safari upload bug',
        description: 'Fix file upload issue on Safari browser. CORS configuration issue.',
        priority: 'high',
        status: 'todo',
        dueDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        tags: ['bug', 'browser', 'frontend'],
        assigneeId: users[2].id,
        teamId: engineeringTeam.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Design new onboarding flow',
        description: 'Create design mockups for new user onboarding experience',
        priority: 'medium',
        status: 'todo',
        dueDate: new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
        tags: ['design', 'ux'],
        assigneeId: users[3].id,
        teamId: designTeam.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Implement user profile page',
        description: 'Build user profile page with settings and preferences',
        priority: 'high',
        status: 'in_progress',
        dueDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        tags: ['frontend', 'feature'],
        assigneeId: users[0].id,
        teamId: engineeringTeam.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Database migration v2.3',
        description: 'Run database migration for version 2.3',
        priority: 'urgent',
        status: 'in_progress',
        dueDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        tags: ['backend', 'db', 'migration'],
        assigneeId: users[4].id,
        teamId: engineeringTeam.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'PR #142 - Mobile responsive fix',
        description: 'Fix mobile responsive issues on dashboard',
        priority: 'medium',
        status: 'review',
        dueDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // Yesterday
        tags: ['frontend', 'mobile', 'responsive'],
        assigneeId: users[3].id,
        teamId: designTeam.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Setup CI/CD pipeline',
        description: 'Configure CI/CD pipeline for automated deployments',
        priority: 'low',
        status: 'done',
        dueDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        tags: ['devops', 'ci-cd'],
        assigneeId: users[4].id,
        teamId: engineeringTeam.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Write unit tests for auth module',
        description: 'Add comprehensive unit tests for authentication module',
        priority: 'medium',
        status: 'done',
        dueDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        tags: ['testing', 'backend'],
        assigneeId: users[2].id,
        teamId: engineeringTeam.id,
      },
    }),
  ]);

  console.log(`✅ Created ${tasks.length} tasks`);

  // 9. Create Task Comments
  console.log('💬 Creating task comments...');
  const taskComments = await Promise.all([
    prisma.taskComment.create({
      data: {
        taskId: tasks[1].id, // Fix Safari upload bug
        userId: users[2].id,
        text: 'ตรวจสอบแล้วเป็นปัญหาเรื่อง CORS configuration ครับ กำลังแก้อยู่',
      },
    }),
    prisma.taskComment.create({
      data: {
        taskId: tasks[1].id,
        userId: users[1].id,
        text: 'ขอบคุณค่ะ ถ้าต้องการ help ทดสอบบอกได้นะ',
      },
    }),
    prisma.taskComment.create({
      data: {
        taskId: tasks[3].id, // Implement user profile page
        userId: users[0].id,
        text: 'Progress: 60% complete. Need to add avatar upload feature.',
      },
    }),
    prisma.taskComment.create({
      data: {
        taskId: tasks[4].id, // Database migration
        userId: users[4].id,
        text: 'Migration script ready. Will run during maintenance window.',
      },
    }),
  ]);
  console.log(`✅ Created ${taskComments.length} task comments`);

  // 10. Create Task Activity Logs
  console.log('📝 Creating task activity logs...');
  const activityLogs = await Promise.all([
    prisma.taskActivityLog.create({
      data: {
        taskId: tasks[1].id,
        userId: users[0].id,
        action: 'created',
        newValue: 'todo',
      },
    }),
    prisma.taskActivityLog.create({
      data: {
        taskId: tasks[1].id,
        userId: users[0].id,
        action: 'assigned',
        oldValue: null,
        newValue: users[2].id,
      },
    }),
    prisma.taskActivityLog.create({
      data: {
        taskId: tasks[3].id,
        userId: users[0].id,
        action: 'status_changed',
        oldValue: 'todo',
        newValue: 'in_progress',
      },
    }),
    prisma.taskActivityLog.create({
      data: {
        taskId: tasks[4].id,
        userId: users[6].id,
        action: 'priority_changed',
        oldValue: 'high',
        newValue: 'urgent',
      },
    }),
    prisma.taskActivityLog.create({
      data: {
        taskId: tasks[6].id,
        userId: users[4].id,
        action: 'status_changed',
        oldValue: 'in_progress',
        newValue: 'done',
      },
    }),
  ]);
  console.log(`✅ Created ${activityLogs.length} activity logs`);

  // 11. Create Channels
  console.log('📢 Creating channels...');
  const channels = await Promise.all([
    prisma.channel.create({
      data: {
        name: 'general',
        type: 'general',
        description: 'General engineering discussions',
        teamId: engineeringTeam.id,
      },
    }),
    prisma.channel.create({
      data: {
        name: 'standup',
        type: 'voice',
        description: 'Daily standup voice channel',
        teamId: engineeringTeam.id,
      },
    }),
    prisma.channel.create({
      data: {
        name: 'announcements',
        type: 'announcement',
        description: 'Important announcements only',
        teamId: engineeringTeam.id,
      },
    }),
    prisma.channel.create({
      data: {
        name: 'general',
        type: 'general',
        description: 'Design team discussions',
        teamId: designTeam.id,
      },
    }),
    prisma.channel.create({
      data: {
        name: 'reviews',
        type: 'general',
        description: 'Design reviews and feedback',
        teamId: designTeam.id,
      },
    }),
    prisma.channel.create({
      data: {
        name: 'general',
        type: 'general',
        description: 'Operations team discussions',
        teamId: operationsTeam.id,
      },
    }),
  ]);

  console.log(`✅ Created ${channels.length} channels`);

  // 12. Create Messages
  console.log('💬 Creating messages...');
  const messages = await Promise.all([
    prisma.message.create({
      data: {
        text: 'Good morning ทุกคน! วันนี้มี standup 10:00 นะคะ 🙏',
        channelId: channels[0].id,
        senderId: users[1].id,
        mentions: [],
      },
    }),
    prisma.message.create({
      data: {
        text: 'ได้ครับ! มีอัปเดตเรื่อง API v2 ด้วย',
        channelId: channels[0].id,
        senderId: users[2].id,
        mentions: [],
      },
    }),
    prisma.message.create({
      data: {
        text: 'เยี่ยมเลย @จิรวัฒน์ เตรียม demo ด้วยนะ',
        channelId: channels[0].id,
        senderId: users[0].id,
        mentions: [users[2].id],
      },
    }),
    prisma.message.create({
      data: {
        text: '📢 Important: New security policy effective next week',
        channelId: channels[2].id, // announcements
        senderId: users[0].id,
        isPinned: true,
        mentions: [],
      },
    }),
    prisma.message.create({
      data: {
        text: 'Design mockups ready for review! 🎨',
        channelId: channels[3].id,
        senderId: users[1].id,
        mentions: [],
      },
    }),
  ]);

  console.log(`✅ Created ${messages.length} messages`);

  // 13. Create Message Reads
  console.log('👁️ Creating message reads...');
  const messageReads = await Promise.all([
    // Users who read first message
    prisma.messageRead.create({
      data: {
        messageId: messages[0].id,
        userId: users[0].id,
      },
    }),
    prisma.messageRead.create({
      data: {
        messageId: messages[0].id,
        userId: users[2].id,
      },
    }),
    prisma.messageRead.create({
      data: {
        messageId: messages[0].id,
        userId: users[4].id,
      },
    }),
    // Users who read second message
    prisma.messageRead.create({
      data: {
        messageId: messages[1].id,
        userId: users[0].id,
      },
    }),
    prisma.messageRead.create({
      data: {
        messageId: messages[1].id,
        userId: users[1].id,
      },
    }),
  ]);
  console.log(`✅ Created ${messageReads.length} message reads`);

  // 14. Create Notifications
  console.log('🔔 Creating notifications...');
  const notifications = await Promise.all([
    prisma.notification.create({
      data: {
        type: 'meeting_starting',
        title: 'Meeting starting soon',
        message: 'Sprint Planning starts in 15 minutes',
        link: `/meeting-lobby/${meetings[0].id}`,
        isRead: false,
        userId: users[2].id,
      },
    }),
    prisma.notification.create({
      data: {
        type: 'task_assigned',
        title: 'Task assigned to you',
        message: 'Fix Safari upload bug has been assigned to you',
        link: `/tasks?task=${tasks[1].id}`,
        isRead: false,
        userId: users[2].id,
      },
    }),
    prisma.notification.create({
      data: {
        type: 'mention',
        title: 'You were mentioned',
        message: 'สมชาย mentioned you in #general',
        link: `/chat?channel=${channels[0].id}`,
        isRead: true,
        userId: users[2].id,
      },
    }),
    prisma.notification.create({
      data: {
        type: 'announcement',
        title: 'New announcement',
        message: 'New security policy effective next week',
        link: `/chat?channel=${channels[2].id}`,
        isRead: false,
        userId: users[3].id,
      },
    }),
    prisma.notification.create({
      data: {
        type: 'task_assigned',
        title: 'Task assigned to you',
        message: 'Design new onboarding flow has been assigned to you',
        link: `/tasks?task=${tasks[2].id}`,
        isRead: false,
        userId: users[3].id,
      },
    }),
  ]);
  console.log(`✅ Created ${notifications.length} notifications`);

  // 15. Create Audit Logs
  console.log('📋 Creating audit logs...');
  const auditLogs = await Promise.all([
    prisma.auditLog.create({
      data: {
        action: 'create_user',
        resource: 'user',
        resourceId: users[1].id,
        details: { email: users[1].email, role: 'admin' },
        userId: users[0].id,
        ipAddress: '192.168.1.100',
      },
    }),
    prisma.auditLog.create({
      data: {
        action: 'create_team',
        resource: 'team',
        resourceId: engineeringTeam.id,
        details: { name: engineeringTeam.name },
        userId: users[0].id,
        ipAddress: '192.168.1.100',
      },
    }),
    prisma.auditLog.create({
      data: {
        action: 'create_meeting',
        resource: 'meeting',
        resourceId: meetings[0].id,
        details: { title: meetings[0].title, meetingCode: meetings[0].meetingCode },
        userId: users[0].id,
        ipAddress: '192.168.1.101',
      },
    }),
    prisma.auditLog.create({
      data: {
        action: 'delete_task',
        resource: 'task',
        resourceId: 'deleted-task-id',
        details: { title: 'Old task' },
        userId: users[0].id,
        ipAddress: '192.168.1.102',
      },
    }),
    prisma.auditLog.create({
      data: {
        action: 'update_permission',
        resource: 'user',
        resourceId: users[2].id,
        details: { oldRole: 'employee', newRole: 'manager' },
        userId: users[0].id,
        ipAddress: '192.168.1.100',
      },
    }),
  ]);
  console.log(`✅ Created ${auditLogs.length} audit logs`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Organization: 1`);
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Teams: 3`);
  console.log(`   - Team Members: 9`);
  console.log(`   - Invites: ${invites.length}`);
  console.log(`   - Meetings: ${meetings.length}`);
  console.log(`   - Meeting Participants: ${participants.length}`);
  console.log(`   - Tasks: ${tasks.length}`);
  console.log(`   - Task Comments: ${taskComments.length}`);
  console.log(`   - Task Activity Logs: ${activityLogs.length}`);
  console.log(`   - Channels: ${channels.length}`);
  console.log(`   - Messages: ${messages.length}`);
  console.log(`   - Message Reads: ${messageReads.length}`);
  console.log(`   - Notifications: ${notifications.length}`);
  console.log(`   - Audit Logs: ${auditLogs.length}`);
  console.log('\n🔑 Default password for all users: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
