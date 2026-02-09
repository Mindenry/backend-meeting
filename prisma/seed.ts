import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.message.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.task.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'somchai@acme.com',
        name: 'สมชาย K.',
      },
    }),
    prisma.user.create({
      data: {
        email: 'arisa@acme.com',
        name: 'อริสา P.',
      },
    }),
    prisma.user.create({
      data: {
        email: 'jirawat@acme.com',
        name: 'จิรวัฒน์ W.',
      },
    }),
    prisma.user.create({
      data: {
        email: 'pim@acme.com',
        name: 'พิมพ์ L.',
      },
    }),
    prisma.user.create({
      data: {
        email: 'thana@acme.com',
        name: 'ธนา S.',
      },
    }),
    prisma.user.create({
      data: {
        email: 'napa@acme.com',
        name: 'นภา M.',
      },
    }),
    prisma.user.create({
      data: {
        email: 'wipa@acme.com',
        name: 'วิภา T.',
      },
    }),
    prisma.user.create({
      data: {
        email: 'kitti@acme.com',
        name: 'กิตติ R.',
      },
    }),
    prisma.user.create({
      data: {
        email: 'preeya@acme.com',
        name: 'ปรียา S.',
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create Teams
  const engineeringTeam = await prisma.team.create({
    data: {
      name: 'Engineering',
    },
  });

  const designTeam = await prisma.team.create({
    data: {
      name: 'Design',
    },
  });

  const operationsTeam = await prisma.team.create({
    data: {
      name: 'Operations',
    },
  });

  console.log('✅ Created 3 teams');

  // Add team members
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

  // Create Meetings
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const meetings = await Promise.all([
    prisma.meeting.create({
      data: {
        title: 'Sprint Planning',
        description: 'Weekly sprint planning meeting',
        startTime: new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10:00 AM today
        endTime: new Date(today.getTime() + 11 * 60 * 60 * 1000), // 11:00 AM
        waitingRoom: true,
        allowScreenShare: true,
        status: 'upcoming',
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
        waitingRoom: false,
        allowScreenShare: true,
        status: 'upcoming',
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
        waitingRoom: false,
        allowScreenShare: false,
        status: 'upcoming',
        hostId: users[0].id,
        teamId: null,
      },
    }),
    prisma.meeting.create({
      data: {
        title: 'Product Roadmap Discussion',
        description: 'Discuss Q2 roadmap',
        startTime: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000), // 9:00 AM tomorrow
        endTime: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000 + 30 * 60 * 1000), // 10:30 AM
        waitingRoom: true,
        allowScreenShare: true,
        status: 'upcoming',
        hostId: users[6].id,
        teamId: null,
      },
    }),
    prisma.meeting.create({
      data: {
        title: 'Daily Standup',
        description: 'Daily team standup',
        startTime: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // 10:00 AM yesterday
        endTime: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000 + 15 * 60 * 1000), // 10:15 AM
        waitingRoom: false,
        allowScreenShare: false,
        status: 'ended',
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
        waitingRoom: true,
        allowScreenShare: true,
        status: 'ended',
        hostId: users[1].id,
        teamId: designTeam.id,
      },
    }),
  ]);

  console.log(`✅ Created ${meetings.length} meetings`);

  // Create Tasks
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Update API documentation',
        description: 'Update API documentation for meeting endpoints',
        priority: 'medium',
        status: 'todo',
        dueDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        tags: ['docs'],
        assigneeId: users[1].id,
        teamId: engineeringTeam.id,
        meetingId: meetings[0].id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Fix Safari upload bug',
        description: 'Fix file upload issue on Safari browser',
        priority: 'high',
        status: 'todo',
        dueDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        tags: ['bug', 'browser'],
        assigneeId: users[2].id,
        teamId: engineeringTeam.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Design new onboarding flow',
        description: 'Create design mockups for new user onboarding',
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
        description: 'Build user profile page with settings',
        priority: 'high',
        status: 'in_progress',
        dueDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        tags: ['frontend'],
        assigneeId: users[0].id,
        teamId: engineeringTeam.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Database migration v2.3',
        description: 'Run database migration for v2.3',
        priority: 'high',
        status: 'in_progress',
        dueDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        tags: ['backend', 'db'],
        assigneeId: users[4].id,
        teamId: engineeringTeam.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'PR #142 - Mobile responsive fix',
        description: 'Fix mobile responsive issues',
        priority: 'medium',
        status: 'review',
        dueDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // Yesterday
        tags: ['frontend', 'mobile'],
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
        tags: ['devops'],
        assigneeId: users[4].id,
        teamId: engineeringTeam.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Write unit tests for auth module',
        description: 'Add comprehensive unit tests for authentication',
        priority: 'medium',
        status: 'done',
        dueDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        tags: ['testing'],
        assigneeId: users[2].id,
        teamId: engineeringTeam.id,
      },
    }),
  ]);

  console.log(`✅ Created ${tasks.length} tasks`);

  // Create Channels
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

  // Create some sample messages
  const messages = await Promise.all([
    prisma.message.create({
      data: {
        text: 'Good morning ทุกคน! วันนี้มี standup 10:00 นะคะ 🙏',
        channelId: channels[0].id,
        senderId: users[1].id,
      },
    }),
    prisma.message.create({
      data: {
        text: 'ได้ครับ! มีอัปเดตเรื่อง API v2 ด้วย',
        channelId: channels[0].id,
        senderId: users[2].id,
      },
    }),
    prisma.message.create({
      data: {
        text: 'เยี่ยมเลย @จิรวัฒน์ เตรียม demo ด้วยนะ',
        channelId: channels[0].id,
        senderId: users[0].id,
      },
    }),
  ]);

  console.log(`✅ Created ${messages.length} messages`);
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

