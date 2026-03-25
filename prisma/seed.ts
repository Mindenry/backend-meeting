import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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
  const modelsToWipe = [
    'directMessage', 'messageReaction', 'thread', 'notificationPreference',
    'notificationDigest', 'refreshToken', 'documentFolder', 'document',
    'documentVersion', 'documentPermission', 'meetingRecording',
    'meetingMinutes', 'reminderRecipient', 'reminder', 'standupEntry',
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
    if ((prisma as any)[model]) {
      await (prisma as any)[model].deleteMany();
    }
  }

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
      { userId: users[1].id, teamId: engineeringTeam.id, role: 'admin' }, // somchai (manager)
      { userId: users[2].id, teamId: engineeringTeam.id, role: 'member' }, // arisa
      { userId: users[3].id, teamId: engineeringTeam.id, role: 'member' }, // jirawat
      { userId: users[4].id, teamId: engineeringTeam.id, role: 'member' }, // pim
      { userId: users[5].id, teamId: engineeringTeam.id, role: 'member' }, // thana
      { userId: users[2].id, teamId: designTeam.id, role: 'admin' }, // arisa
      { userId: users[3].id, teamId: designTeam.id, role: 'member' }, // jirawat
      { userId: users[6].id, teamId: operationsTeam.id, role: 'admin' }, // napa
      { userId: users[7].id, teamId: operationsTeam.id, role: 'member' }, // wipa
      { userId: users[8].id, teamId: operationsTeam.id, role: 'member' }, // kitti
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
        status: 'done',
        dueDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // Yesterday
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
        status: 'done',
        dueDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
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
        status: 'done',
        dueDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
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
        status: 'done',
        dueDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // Yesterday
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
        status: 'done',
        dueDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // Yesterday
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
        status: 'done',
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

  console.log(`✅ Created ${tasks.length} static tasks`);

  // Generate additional dynamic tasks for realistic performance data
  console.log('🔄 Generating bulk realistic tasks...');
  const dynamicTasks: any[] = [];
  const statuses = ['done', 'done', 'done', 'done', 'in_progress', 'todo']; // Skew towards done
  const priorities = ['low', 'medium', 'high', 'urgent'];
  
  for (let i = 0; i < 80; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    // Random user from index 0 to 8 (9 users total)
    const randomUser = users[Math.floor(Math.random() * users.length)];
    // Random team (engineering, design, ops)
    const teams = [engineeringTeam, designTeam, operationsTeam];
    const randomTeam = teams[Math.floor(Math.random() * teams.length)];
    
    // Random due date between 10 days ago and 10 days from now
    const offsetDays = Math.floor(Math.random() * 20) - 10;
    const dueDate = new Date(today.getTime() + offsetDays * 24 * 60 * 60 * 1000);
    
    dynamicTasks.push({
      title: `Auto-generated task #${i + 1}`,
      description: `This is an automatically generated task for testing performance metrics. It's varied to look realistic.`,
      priority,
      status,
      dueDate,
      tags: ['generated', 'test-data'],
      assigneeId: randomUser.id,
      teamId: randomTeam.id,
    });
  }

  const createdDynamicTasks = await Promise.all(
    dynamicTasks.map(taskData => prisma.task.create({ data: taskData }))
  );

  console.log(`✅ Created ${createdDynamicTasks.length} dynamic tasks`);

  // Combine tasks arrays for later references
  tasks.push(...createdDynamicTasks);

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
        read: false,
        userId: users[2].id,
      },
    }),
    prisma.notification.create({
      data: {
        type: 'task_assigned',
        title: 'Task assigned to you',
        message: 'Fix Safari upload bug has been assigned to you',
        link: `/tasks?task=${tasks[1].id}`,
        read: false,
        userId: users[2].id,
      },
    }),
    prisma.notification.create({
      data: {
        type: 'mention',
        title: 'You were mentioned',
        message: 'สมชาย mentioned you in #general',
        link: `/chat?channel=${channels[0].id}`,
        read: true,
        userId: users[2].id,
      },
    }),
    prisma.notification.create({
      data: {
        type: 'announcement',
        title: 'New announcement',
        message: 'New security policy effective next week',
        link: `/chat?channel=${channels[2].id}`,
        read: false,
        userId: users[3].id,
      },
    }),
    prisma.notification.create({
      data: {
        type: 'task_assigned',
        title: 'Task assigned to you',
        message: 'Design new onboarding flow has been assigned to you',
        link: `/tasks?task=${tasks[2].id}`,
        read: false,
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
        entity: 'user',
        entityId: users[1].id,
        details: { email: users[1].email, role: 'admin' },
        userId: users[0].id,
        ipAddress: '192.168.1.100',
      },
    }),
    prisma.auditLog.create({
      data: {
        action: 'create_team',
        entity: 'team',
        entityId: engineeringTeam.id,
        details: { name: engineeringTeam.name },
        userId: users[0].id,
        ipAddress: '192.168.1.100',
      },
    }),
    prisma.auditLog.create({
      data: {
        action: 'create_meeting',
        entity: 'meeting',
        entityId: meetings[0].id,
        details: { title: meetings[0].title, meetingCode: meetings[0].meetingCode },
        userId: users[0].id,
        ipAddress: '192.168.1.101',
      },
    }),
    prisma.auditLog.create({
      data: {
        action: 'delete_task',
        entity: 'task',
        entityId: 'deleted-task-id',
        details: { title: 'Old task' },
        userId: users[0].id,
        ipAddress: '192.168.1.102',
      },
    }),
    prisma.auditLog.create({
      data: {
        action: 'update_permission',
        entity: 'user',
        entityId: users[2].id,
        details: { oldRole: 'employee', newRole: 'manager' },
        userId: users[0].id,
        ipAddress: '192.168.1.100',
      },
    }),
  ]);
  console.log(`✅ Created ${auditLogs.length} audit logs`);

  // 16. Create Wiki Articles
  console.log('📚 Creating wiki articles...');
  const wikiArticles = await Promise.all([
    prisma.wikiArticle.create({
      data: {
        title: 'Getting Started with Team Connect',
        content: `# Getting Started with Team Connect

Welcome to Team Connect! This guide will help you get started.

## Features

- **Meetings**: Schedule and join video meetings
- **Tasks**: Manage your tasks and track progress
- **Chat**: Communicate with your team
- **Knowledge Base**: Share and find information

## Quick Tips

1. Create your first meeting from the Meetings page
2. Join team channels to start chatting
3. Create tasks to track your work

Happy collaborating! 🎉`,
        category: 'Getting Started',
        tags: ['onboarding', 'guide', 'basics'],
        isPublic: true,
        teamId: null,
        createdBy: users[0].id,
        version: 1,
        viewCount: 42,
      },
    }),
    prisma.wikiArticle.create({
      data: {
        title: 'API Documentation',
        content: `# API Documentation

## Authentication

All API requests require authentication using JWT tokens.

\`\`\`bash
Authorization: Bearer <token>
\`\`\`

## Endpoints

### Meetings
- \`GET /api/meetings\` - List all meetings
- \`POST /api/meetings\` - Create a meeting
- \`GET /api/meetings/:id\` - Get meeting details

### Tasks
- \`GET /api/tasks\` - List all tasks
- \`POST /api/tasks\` - Create a task
- \`PATCH /api/tasks/:id\` - Update a task

For more details, see the full API documentation.`,
        category: 'Development',
        tags: ['api', 'documentation', 'technical'],
        isPublic: true,
        teamId: engineeringTeam.id,
        createdBy: users[1].id,
        version: 1,
        viewCount: 128,
      },
    }),
    prisma.wikiArticle.create({
      data: {
        title: 'Best Practices for Remote Work',
        content: `# Best Practices for Remote Work

Working remotely requires discipline and good communication.

## Communication

- **Be responsive**: Reply to messages within reasonable time
- **Use video**: Turn on video during meetings when possible
- **Update status**: Keep your status updated so teammates know your availability

## Time Management

- Set clear boundaries between work and personal time
- Use focus mode to minimize distractions
- Take regular breaks

## Collaboration

- Document everything important
- Share knowledge in the wiki
- Participate in team standups

Remember: Remote work is about flexibility, not isolation!`,
        category: 'Workplace',
        tags: ['remote-work', 'productivity', 'tips'],
        isPublic: true,
        teamId: null,
        createdBy: users[2].id,
        version: 1,
        viewCount: 89,
      },
    }),
    prisma.wikiArticle.create({
      data: {
        title: 'Design System Guidelines',
        content: `# Design System Guidelines

Our design system ensures consistency across all products.

## Colors

- **Primary**: #3B82F6 (Blue)
- **Secondary**: #10B981 (Green)
- **Accent**: #F59E0B (Amber)

## Typography

- **Headings**: Inter, Bold
- **Body**: Inter, Regular
- **Code**: Fira Code, Regular

## Components

All components follow our design system. See component library for details.`,
        category: 'Design',
        tags: ['design', 'ui', 'guidelines'],
        isPublic: false,
        teamId: designTeam.id,
        createdBy: users[1].id,
        version: 1,
        viewCount: 56,
      },
    }),
    prisma.wikiArticle.create({
      data: {
        title: 'Deployment Process',
        content: `# Deployment Process

## Pre-deployment Checklist

- [ ] All tests passing
- [ ] Code review approved
- [ ] Database migrations ready
- [ ] Environment variables configured

## Deployment Steps

1. Merge to main branch
2. CI/CD pipeline runs automatically
3. Deploy to staging first
4. Run smoke tests
5. Deploy to production

## Rollback

If issues occur, rollback immediately using:
\`\`\`bash
npm run rollback
\`\`\``,
        category: 'DevOps',
        tags: ['deployment', 'ci-cd', 'operations'],
        isPublic: false,
        teamId: engineeringTeam.id,
        createdBy: users[4].id,
        version: 1,
        viewCount: 34,
      },
    }),
  ]);
  console.log(`✅ Created ${wikiArticles.length} wiki articles`);

  // 17. Create Announcements
  console.log('📢 Creating announcements...');
  const announcements = await Promise.all([
    prisma.announcement.create({
      data: {
        title: 'Welcome to Team Connect!',
        content: `# Welcome to Team Connect! 🎉

We're excited to have you on board! Team Connect is your all-in-one collaboration platform.

## What's New

- **Video Meetings**: High-quality video conferencing
- **Task Management**: Track and manage your work
- **Team Chat**: Real-time communication
- **Knowledge Base**: Share and discover information

## Getting Started

1. Complete your profile
2. Join your team channels
3. Explore the features

If you have any questions, feel free to reach out to our support team.

Happy collaborating!`,
        priority: 'normal',
        targetType: 'all',
        targetIds: [],
        attachments: undefined,
        createdBy: users[0].id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        status: 'active',
      },
    }),
    prisma.announcement.create({
      data: {
        title: 'Security Policy Update',
        content: `# Security Policy Update 🔒

We're updating our security policies to better protect your data.

## Changes

- **Password Requirements**: Minimum 12 characters
- **2FA**: Required for all admin accounts
- **Session Timeout**: 8 hours of inactivity

## Action Required

Please update your password by the end of this week if it doesn't meet the new requirements.

## Questions?

Contact IT support if you have any concerns.`,
        priority: 'high',
        targetType: 'all',
        targetIds: [],
        attachments: undefined,
        createdBy: users[0].id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: 'active',
      },
    }),
    prisma.announcement.create({
      data: {
        title: 'Team Offsite Event',
        content: `# Team Offsite Event 🎊

We're organizing a team offsite event next month!

## Details

- **Date**: March 15-16, 2024
- **Location**: Beach Resort, Pattaya
- **Activities**: Team building, workshops, and fun!

## RSVP

Please confirm your attendance by March 1st.

Looking forward to seeing everyone!`,
        priority: 'normal',
        targetType: 'team',
        targetIds: [engineeringTeam.id, designTeam.id],
        attachments: undefined,
        createdBy: users[1].id,
        expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days
        status: 'active',
      },
    }),
    prisma.announcement.create({
      data: {
        title: 'New Feature: Knowledge Base',
        content: `# New Feature: Knowledge Base 📚

We've just launched our Knowledge Base feature!

## What is it?

A centralized place to store and share team knowledge, documentation, and best practices.

## How to Use

1. Go to Knowledge Base from the sidebar
2. Create articles to share information
3. Organize by categories and tags
4. Search to find what you need

Start documenting your team's knowledge today!`,
        priority: 'normal',
        targetType: 'all',
        targetIds: [],
        attachments: undefined,
        createdBy: users[0].id,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        status: 'active',
      },
    }),
    prisma.announcement.create({
      data: {
        title: 'System Maintenance Tonight',
        content: `# System Maintenance Tonight ⚙️

We'll be performing system maintenance tonight.

## Schedule

- **Start**: 10:00 PM (February 21)
- **End**: 2:00 AM (February 22)
- **Duration**: ~4 hours

## Impact

The system will be unavailable during this time. Please save your work before the maintenance window.

## Questions?

Contact support if you have urgent matters.`,
        priority: 'urgent',
        targetType: 'all',
        targetIds: [],
        attachments: undefined,
        createdBy: users[0].id,
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day
        status: 'active',
      },
    }),
  ]);
  console.log(`✅ Created ${announcements.length} announcements`);

  // 18. Create Announcement Reads (some users have read some announcements)
  console.log('👁️ Creating announcement reads...');
  const announcementReads = await Promise.all([
    prisma.announcementRead.create({
      data: {
        announcementId: announcements[0].id,
        userId: users[0].id,
      },
    }),
    prisma.announcementRead.create({
      data: {
        announcementId: announcements[0].id,
        userId: users[1].id,
      },
    }),
    prisma.announcementRead.create({
      data: {
        announcementId: announcements[1].id,
        userId: users[0].id,
      },
    }),
    prisma.announcementRead.create({
      data: {
        announcementId: announcements[3].id,
        userId: users[2].id,
      },
    }),
  ]);
  console.log(`✅ Created ${announcementReads.length} announcement reads`);

  // 19. Create Time Entries (for Reports)
  console.log('⏱️ Creating time entries...');
  const timeEntries = await Promise.all([
    // Time entries for this week
    prisma.timeEntry.create({
      data: {
        userId: users[0].id,
        taskId: tasks[3].id, // Implement user profile page
        description: 'Working on user profile UI',
        startTime: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000), // 2 days ago, 9 AM
        endTime: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000), // 12 PM
        duration: 3 * 60 * 60, // 3 hours
        billable: true,
        tags: ['frontend', 'ui'],
      },
    }),
    prisma.timeEntry.create({
      data: {
        userId: users[1].id,
        taskId: tasks[0].id, // Update API documentation
        description: 'Writing API documentation',
        startTime: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // Yesterday, 10 AM
        endTime: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000), // 1 PM
        duration: 3 * 60 * 60,
        billable: true,
        tags: ['docs'],
      },
    }),
    prisma.timeEntry.create({
      data: {
        userId: users[2].id,
        taskId: tasks[1].id, // Fix Safari upload bug
        description: 'Debugging Safari CORS issue',
        startTime: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000), // Yesterday, 2 PM
        endTime: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000), // 5 PM
        duration: 3 * 60 * 60,
        billable: true,
        tags: ['bug-fix', 'frontend'],
      },
    }),
    prisma.timeEntry.create({
      data: {
        userId: users[0].id,
        meetingId: meetings[0].id, // Sprint Planning
        description: 'Sprint planning meeting',
        startTime: new Date(today.getTime() + 10 * 60 * 60 * 1000), // Today, 10 AM
        endTime: new Date(today.getTime() + 11 * 60 * 60 * 1000), // 11 AM
        duration: 1 * 60 * 60,
        billable: false,
        tags: ['meeting'],
      },
    }),
  ]);
  console.log(`✅ Created ${timeEntries.length} time entries`);

  // 20. Create Work Hours (for Reports)
  console.log('📊 Creating work hours...');
  const workHours = await Promise.all([
    prisma.workHours.create({
      data: {
        userId: users[0].id,
        teamId: engineeringTeam.id,
        date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        hours: 8.0,
        notes: 'Full day of development work',
      },
    }),
    prisma.workHours.create({
      data: {
        userId: users[1].id,
        teamId: engineeringTeam.id,
        date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // Yesterday
        hours: 7.5,
        notes: 'Documentation and code review',
      },
    }),
    prisma.workHours.create({
      data: {
        userId: users[2].id,
        teamId: engineeringTeam.id,
        date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // Yesterday
        hours: 8.0,
        notes: 'Bug fixing and testing',
      },
    }),
    prisma.workHours.create({
      data: {
        userId: users[0].id,
        teamId: engineeringTeam.id,
        date: new Date(today.getTime()), // Today
        hours: 4.0,
        notes: 'Morning work session',
      },
    }),
  ]);
  console.log(`✅ Created ${workHours.length} work hours`);

  
  // --- MISSING TABLE SEEDS ADDED AUTOMATICALLY ---
  console.log('📦 Creating missing mock data...');
  
  // 21. Direct Messages
  const directMessages = await prisma.directMessage.create({
    data: {
      text: 'Hey, how is the project going?',
      senderId: users[0].id,
      receiverId: users[1].id,
    }
  });
  
  // 22. Threads
  const threads = await prisma.thread.create({
    data: {
      messageId: messages[0].id,
      channelId: channels[0].id,
    }
  });
  
  // 23. Message Reactions
  await prisma.messageReaction.create({
    data: {
      emoji: '👍',
      messageId: messages[0].id,
      userId: users[0].id,
    }
  });

  // 24. Notification Preferences
  await prisma.notificationPreference.create({
    data: {
      userId: users[0].id,
      desktopEnabled: true,
      soundEnabled: true,
      badgeEnabled: true,
      mentionDelivery: 'realtime',
    }
  });
  
  // 25. Notification Digest
  await prisma.notificationDigest.create({
    data: {
      userId: users[0].id,
      digestType: 'daily',
      periodStart: new Date(today.getTime() - 24 * 60 * 60 * 1000),
      periodEnd: new Date(),
      byType: {},
      highlights: {},
    }
  });

  // 26. Document Folder
  const docFolder = await prisma.documentFolder.create({
    data: {
      name: 'Project Specs',
      teamId: engineeringTeam.id,
      createdBy: users[0].id,
    }
  });

  // 27. Documents
  const document = await prisma.document.create({
    data: {
      name: 'Q1 Goals',
      description: 'We need to finish the new UI.',
      fileUrl: 'https://example.com/doc',
      fileSize: 1024,
      mimeType: 'text/markdown',
      folderId: docFolder.id,
      createdBy: users[0].id,
      teamId: engineeringTeam.id,
    }
  });

  // 28. Document Versions
  await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      version: 1,
      fileUrl: 'https://example.com/doc',
      fileSize: 1024,
      mimeType: 'text/markdown',
      createdBy: users[0].id,
    }
  });

  // 29. Document Permissions
  await prisma.documentPermission.create({
    data: {
      documentId: document.id,
      userId: users[1].id,
      permission: 'write',
    }
  });

  // 30. Meeting Recordings & Minutes
  await prisma.meetingRecording.create({
    data: {
      meetingId: meetings[3].id,
      fileUrl: 'https://example.com/recording.mp4',
      duration: 3600,
      fileSize: 2048,
      createdBy: users[0].id,
    }
  });
  
  await prisma.meetingMinutes.create({
    data: {
      title: 'Standup Minutes',
      meetingId: meetings[3].id,
      content: 'We discussed X, Y, Z.',
      createdBy: users[0].id,
    }
  });

  // 31. Reminders
  const reminder = await prisma.reminder.create({
    data: {
      title: 'Check server logs',
      type: 'custom',
      remindAt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      createdBy: users[0].id,
    }
  });

  await prisma.reminderRecipient.create({
    data: {
      reminderId: reminder.id,
      userId: users[1].id,
    }
  });

  // 32. Standup Entries
  await prisma.standupEntry.create({
    data: {
      userId: users[0].id,
      teamId: engineeringTeam.id,
      date: today,
      rawText: 'Yesterday: stuff. Today: things. Blockers: none.',
      yesterday: ['Worked on DB stuff'],
      today: ['Seeding mock data'],
      blockers: ['None'],
    }
  });

  // 33. Drive Entries & Versions
  const driveEntry = await prisma.driveEntry.create({
    data: {
      name: 'Logo.png',
      isFolder: false,
      teamId: engineeringTeam.id,
      createdById: users[0].id,
    }
  });

  await prisma.driveFileVersion.create({
    data: {
      entryId: driveEntry.id,
      version: 1,
      storageKey: 'logo.png',
      size: 1024,
      mimeType: 'image/png',
      createdById: users[0].id,
    }
  });

  // 34. Task Additions (Subtasks, Attachments, IssueLinks)
  await prisma.subtask.create({
    data: {
      taskId: tasks[0].id,
      title: 'Setup DB',
      isCompleted: false,
    }
  });

  await prisma.taskAttachment.create({
    data: {
      taskId: tasks[0].id,
      name: 'spec.pdf',
      url: 'https://example.com/spec.pdf',
      size: 2048,
      userId: users[0].id,
    }
  });

  if (tasks.length > 1) {
    await prisma.issueLink.create({
      data: {
        sourceId: tasks[0].id,
        targetId: tasks[1].id,
        type: 'blocks',
      }
    });
  }

  // 35. Meeting Reminders
  await prisma.meetingReminder.create({
    data: {
      meetingId: meetings[0].id,
      userId: users[0].id,
      minutesBefore: 15,
    }
  });

  // 36. Workflows
  const workflow = await prisma.workflow.create({
    data: {
      name: 'Auto-assign bugs',
      trigger: 'task_created',
      conditions: { type: 'bug' },
      actions: { assignTo: users[0].id },
      teamId: engineeringTeam.id,
      createdBy: users[0].id,
    }
  });

  await prisma.workflowRun.create({
    data: {
      workflowId: workflow.id,
      status: 'success',
      startedAt: new Date(),
      completedAt: new Date(),
      userId: users[0].id,
    }
  });

  // 37. Wiki Additions
  await prisma.wikiArticleVersion.create({
    data: {
      articleId: wikiArticles[0].id,
      version: 1,
      title: wikiArticles[0].id,
      content: wikiArticles[0].content,
      createdBy: users[0].id,
    }
  });

  await prisma.wikiComment.create({
    data: {
      articleId: wikiArticles[0].id,
      content: 'Looks good!',
      createdBy: users[0].id,
    }
  });

  // 38. Task Templates
  await prisma.taskTemplate.create({
    data: {
      name: 'Standard Bug',
      title: 'Bug: ',
      description: 'Describe the bug here.',
      teamId: engineeringTeam.id,
      createdById: users[0].id,
    }
  });

  await prisma.taskWatcher.create({
    data: {
      taskId: tasks[0].id,
      userId: users[0].id,
    }
  });

  // 39. Roles & Priorities
  await prisma.rolePermission.create({
    data: {
      organizationId: organization.id,
      role: 'admin',
      resource: 'users',
      action: 'create',
    }
  });

  await prisma.taskWorkflowStatus.create({
    data: {
      name: 'To Do',
      key: 'todo',
      category: 'todo',
      position: 1,
      teamId: engineeringTeam.id,
    }
  });

  // 40. Refresh Token
  await prisma.refreshToken.create({
    data: {
      userId: users[0].id,
      token: 'sample_refresh_token_12345',
      expiresAt: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  // 41. Agile/Project Management Additions
  const project = await prisma.project.create({
    data: {
      name: 'Alpha Project',
      key: 'ALPHA',
      description: 'The first Alpha phase project',
      teamId: engineeringTeam.id,
    }
  });

  const sprint = await prisma.sprint.create({
    data: {
      name: 'Sprint 1',
      goal: 'Complete auth flow',
      startDate: new Date(),
      endDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000),
      teamId: engineeringTeam.id,
      createdById: users[0].id,
      status: 'active'
    }
  });

  const epic = await prisma.epic.create({
    data: {
      name: 'User Authentication',
      description: 'Everything related to login and signup',
      status: 'active',
      teamId: engineeringTeam.id,
      createdById: users[0].id,
    }
  });

  const component = await prisma.component.create({
    data: {
      name: 'Frontend Auth API',
      description: 'React components for Auth',
      teamId: engineeringTeam.id,
    }
  });

  const version = await prisma.version.create({
    data: {
      name: 'v1.0.0',
      description: 'First public release',
      teamId: engineeringTeam.id,
    }
  });

  const holiday = await prisma.holiday.create({
    data: {
      name: 'New Year',
      nameEn: 'New Year',
      date: new Date('2026-01-01'),
      organizationId: organization.id,
      type: 'official',
      country: 'TH',
    }
  });

  console.log('✅ Created missing dependencies');

  
  // --- FILLING OPTIONAL (NULL) FIELDS FOR COMPLETENESS ---
  console.log('🔄 Filling optional fields to remove nulls...');
  
  // 1. Update Users
  for (let i = 0; i < users.length; i++) {
    await prisma.user.update({
      where: { id: users[i].id },
      data: {
        displayName: users[i].name.split(' ')[0] + ' (Dev)',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(users[i].name)}&background=random`,
        department: 'Engineering',
        position: 'Software Engineer',
      }
    });
  }

  // 2. Update Meetings
  for (const m of meetings) {
    await prisma.meeting.update({
      where: { id: m.id },
      data: {
        actualStartTime: m.startTime,
        actualEndTime: m.endTime || new Date(m.startTime.getTime() + 60 * 60 * 1000),
        summary: 'Discussed project updates and blockers.',
        teamId: engineeringTeam.id,
      }
    });
  }

  // 3. Update Tasks
  for (let i = 0; i < tasks.length; i++) {
    await prisma.task.update({
      where: { id: tasks[i].id },
      data: {
        resolution: tasks[i].status === 'done' ? 'Done' : null,
        storyPoints: Math.floor(Math.random() * 8) + 1,
        estimate: Math.floor(Math.random() * 10) + 2,
        reporterId: users[0].id,
        sprintId: sprint.id,
        epicId: epic.id,
        projectId: project.id,
        componentId: component.id,
        versionId: version.id,
      }
    });
  }

  // 4. Update Messages & DMs
  for (const msg of messages) {
    if (Math.random() > 0.5) {
      await prisma.message.update({
        where: { id: msg.id },
        data: {
          attachments: [{ name: 'screenshot.png', url: 'https://example.com/screenshot.png' }]
        }
      });
    }
  }

  // 5. Update other entities loosely
  await prisma.auditLog.updateMany({
    data: {
      userName: 'System Admin',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      ipAddress: '192.168.1.1'
    }
  });

  await prisma.documentFolder.updateMany({
    data: { description: 'Main folder for project documentation.' }
  });

  await prisma.meetingMinutes.updateMany({
    data: {
      actionItems: ['Fix login bug', 'Update schema'],
      decisions: ['Use PostgreSQL', 'Deploy to AWS']
    }
  });

  await prisma.sprint.updateMany({
    data: { description: 'First sprint of the new project phase.' }
  });

  await prisma.epic.updateMany({
    data: { color: '#FF5733' }
  });

  await prisma.project.updateMany({
    data: { color: '#3366FF' }
  });

  await prisma.version.updateMany({
    data: { releaseDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) }
  });

  console.log('✅ Filled missing fields');

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
  console.log(`   - Wiki Articles: ${wikiArticles.length}`);
  console.log(`   - Announcements: ${announcements.length}`);
  console.log(`   - Announcement Reads: ${announcementReads.length}`);
  console.log(`   - Time Entries: ${timeEntries.length}`);
  console.log(`   - Work Hours: ${workHours.length}`);
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
