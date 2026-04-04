import { PrismaClient, Prisma } from '@prisma/client';
import { fakerTH as faker } from '@faker-js/faker';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
faker.seed(20260404);

const now = new Date();
const passwordHash = bcrypt.hashSync('password123', 10);

// Helper functions
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const chance = (p: number) => Math.random() < p;
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Date helpers
const daysAgo = (days: number) => new Date(now.getTime() - days * 86400000);
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3600000);
const daysFromNow = (days: number) => new Date(now.getTime() + days * 86400000);

async function main() {
  console.log('🌱 Seeding comprehensive report data...');

  // ============================================
  // Clean existing data first (in correct order for foreign keys)
  // ============================================
  console.log('🧹 Cleaning existing data...');
  
  // Delete in order: child entities first, then parents
  await prisma.notification.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.notificationDigest.deleteMany();
  await prisma.announcementRead.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.meetingReminder.deleteMany();
  await prisma.reminderRecipient.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.meetingParticipant.deleteMany();
  await prisma.meetingRecording.deleteMany();
  await prisma.meetingMinutes.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.messageReaction.deleteMany();
  await prisma.messageRead.deleteMany();
  await prisma.directMessage.deleteMany();
  await prisma.thread.deleteMany(); // Thread before message
  await prisma.message.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.workHours.deleteMany();
  await prisma.taskActivityLog.deleteMany();
  await prisma.taskAttachment.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskWatcher.deleteMany();
  await prisma.issueLink.deleteMany();
  await prisma.task.deleteMany();
  await prisma.taskTemplate.deleteMany();
  await prisma.taskWorkflowStatus.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.epic.deleteMany();
  await prisma.project.deleteMany();
  await prisma.component.deleteMany();
  await prisma.version.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.documentPermission.deleteMany();
  await prisma.document.deleteMany();
  await prisma.documentFolder.deleteMany();
  await prisma.driveFileVersion.deleteMany();
  await prisma.drivePermission.deleteMany();
  await prisma.driveEntry.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.wikiComment.deleteMany();
  await prisma.wikiArticleVersion.deleteMany();
  await prisma.wikiArticle.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  console.log('   ✓ Data cleaned');

  // ============================================
  // Organization & Roles
  // ============================================
  const org = await prisma.organization.create({
    data: {
      name: 'Siam Digital Solutions',
      domain: 'siamdigital.co.th',
      allowedDomains: ['siamdigital.co.th', 'siamdigital.com'],
      logo: 'https://ui-avatars.com/api/?name=SDS&background=0D8ABC&color=fff',
      settings: {
        departments: [
          { name: 'Engineering', positions: ['CTO', 'Technical Lead', 'Senior Developer', 'Developer', 'Junior Developer'] },
          { name: 'Design & UX', positions: ['Design Director', 'UX Lead', 'UI Designer', 'UX Designer'] },
          { name: 'Product', positions: ['Product Director', 'Product Manager', 'Product Owner', 'Business Analyst'] },
          { name: 'QA', positions: ['QA Lead', 'QA Engineer', 'Test Engineer'] },
          { name: 'DevOps', positions: ['DevOps Lead', 'DevOps Engineer', 'SRE'] },
          { name: 'Marketing', positions: ['Marketing Manager', 'Content Writer', 'SEO Specialist'] },
        ],
      },
    },
  });

  // Role permissions
  await prisma.rolePermission.createMany({
    data: [
      { organizationId: org.id, role: 'org_owner', resource: 'all', action: 'manage', allowed: true },
      { organizationId: org.id, role: 'admin', resource: 'users', action: 'manage', allowed: true },
      { organizationId: org.id, role: 'admin', resource: 'teams', action: 'manage', allowed: true },
      { organizationId: org.id, role: 'manager', resource: 'tasks', action: 'manage', allowed: true },
      { organizationId: org.id, role: 'manager', resource: 'meetings', action: 'manage', allowed: true },
      { organizationId: org.id, role: 'employee', resource: 'tasks', action: 'view', allowed: true },
    ],
  });

  // ============================================
  // Users (20 users for richer data)
  // ============================================
  const userData = [
    { name: 'ธีรภัทร์ วัฒนกุล', email: 'teerapat@siamdigital.co.th', role: 'org_owner', dept: 'Engineering', pos: 'CTO' },
    { name: 'กัญญา ศรีสุข', email: 'kanya@siamdigital.co.th', role: 'admin', dept: 'Project Management', pos: 'Project Manager' },
    { name: 'ภูวดล จิรากุล', email: 'phuwadon@siamdigital.co.th', role: 'manager', dept: 'Engineering', pos: 'Technical Lead' },
    { name: 'อริษา เทควงศ์', email: 'arisa@siamdigital.co.th', role: 'manager', dept: 'Design & UX', pos: 'Design Director' },
    { name: 'ณัฐพงษ์ ประภาษ', email: 'nattapong@siamdigital.co.th', role: 'employee', dept: 'Engineering', pos: 'Senior Developer' },
    { name: 'พัชรา ลิ้มวงศ์', email: 'patchara@siamdigital.co.th', role: 'employee', dept: 'Engineering', pos: 'Developer' },
    { name: 'ธนกฤต มั่นคง', email: 'thanakrit@siamdigital.co.th', role: 'employee', dept: 'Product', pos: 'Business Analyst' },
    { name: 'พิมพ์ชนก รัตน์', email: 'pimchanok@siamdigital.co.th', role: 'employee', dept: 'QA', pos: 'QA Engineer' },
    { name: 'วิภา สุขสันต์', email: 'wipa@siamdigital.co.th', role: 'employee', dept: 'Design & UX', pos: 'UI Designer' },
    { name: 'ธีรพงษ์ แก้วใส', email: 'teerapong@siamdigital.co.th', role: 'employee', dept: 'Engineering', pos: 'Developer' },
    { name: 'สุดาวรรณ พงษ์ไพบูลย์', email: 'sudawan@siamdigital.co.th', role: 'employee', dept: 'Product', pos: 'Product Owner' },
    { name: 'อนันต์ ชัยมงคล', email: 'anan@siamdigital.co.th', role: 'employee', dept: 'DevOps', pos: 'DevOps Engineer' },
    { name: 'มินตรา จันทร์แก้ว', email: 'mintra@siamdigital.co.th', role: 'employee', dept: 'Marketing', pos: 'Content Writer' },
    { name: 'ภูมิภัทร นามสกุล', email: 'phumiphat@siamdigital.co.th', role: 'employee', dept: 'Engineering', pos: 'Junior Developer' },
    { name: 'ณิชากร สุขฤทัย', email: 'nichakon@siamdigital.co.th', role: 'employee', dept: 'Design & UX', pos: 'UX Designer' },
    { name: 'กิตติพงษ์ มั่นมาก', email: 'kittipong@siamdigital.co.th', role: 'employee', dept: 'QA', pos: 'Test Engineer' },
    { name: 'อภิชญา วงศ์วิไล', email: 'apitchaya@siamdigital.co.th', role: 'employee', dept: 'Product', pos: 'Business Analyst' },
    { name: 'ธนากร ศรีสวัสดิ์', email: 'thanakon@siamdigital.co.th', role: 'employee', dept: 'DevOps', pos: 'SRE' },
    { name: 'พิชญา พงษ์ไพบูลย์', email: 'pichaya@siamdigital.co.th', role: 'employee', dept: 'Marketing', pos: 'SEO Specialist' },
    { name: 'วรภัทร จิระกุล', email: 'woraphat@siamdigital.co.th', role: 'employee', dept: 'Engineering', pos: 'Developer' },
  ];

  const users = await Promise.all(
    userData.map((u, i) =>
      prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          displayName: u.name.split(' ')[0],
          password: passwordHash,
          role: u.role,
          status: pick(['online', 'busy', 'away', 'offline']),
          activity: pick(['Available', 'In a meeting', 'Deep work', 'On break', 'Focus time']),
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`,
          isActive: true,
          department: u.dept,
          position: u.pos,
          organizationId: org.id,
          createdAt: daysAgo(365 - i * 15),
        },
      }).then(user => ({ id: user.id, name: user.name, email: user.email, role: user.role, dept: u.dept }))
    )
  );

  // Manager relationships
  const managers = users.filter(u => ['manager', 'org_owner', 'admin'].includes(u.role));
  await Promise.all(
    users.filter(u => u.role === 'employee').map(u =>
      prisma.user.update({ where: { id: u.id }, data: { managerId: pick(managers).id } })
    )
  );

  // ============================================
  // Teams (4 teams)
  // ============================================
  const teamData = [
    { name: 'Platform Team', desc: 'Backend & Infrastructure' },
    { name: 'Product Team', desc: 'Frontend & Mobile Apps' },
    { name: 'Design Team', desc: 'UX/UI Design & Research' },
    { name: 'Growth Team', desc: 'Marketing & Analytics' },
  ];

  const teams = await Promise.all(
    teamData.map(t =>
      prisma.team.create({
        data: { name: t.name, description: t.desc, organizationId: org.id },
      }).then(team => ({ id: team.id, name: team.name }))
    )
  );

  // Team members (distribute users across teams)
  const teamMembers: Prisma.TeamMemberCreateManyInput[] = [];
  teams.forEach((team, ti) => {
    const start = ti * 5;
    const teamUsers = users.slice(start, start + 6);
    teamUsers.forEach((u, j) => {
      teamMembers.push({
        teamId: team.id,
        userId: u.id,
        role: j === 0 ? 'admin' : j === 1 ? 'lead' : 'member',
      });
    });
  });
  await prisma.teamMember.createMany({ data: teamMembers, skipDuplicates: true });

  // ============================================
  // Projects, Sprints, Epics
  // ============================================
  const projects = await Promise.all(
    teams.map((team, i) =>
      prisma.project.create({
        data: {
          teamId: team.id,
          key: ['PLAT', 'PROD', 'DSGN', 'GROW'][i],
          name: `${team.name} Main Project`,
          color: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'][i],
        },
      }).then(p => ({ id: p.id, teamId: team.id }))
    )
  );

  // Sprints (multiple per team for history)
  const sprints = await Promise.all(
    teams.flatMap(team =>
      [0, 1, 2].map(sprintNum =>
        prisma.sprint.create({
          data: {
            name: `${team.name} Sprint ${sprintNum + 1}`,
            teamId: team.id,
            createdById: managers[0].id,
            startDate: daysAgo(30 - sprintNum * 14),
            endDate: daysAgo(16 - sprintNum * 14),
            status: sprintNum === 0 ? 'active' : 'closed',
          },
        }).then(s => ({ id: s.id, teamId: team.id, sprintNum }))
      )
    )
  );

  // Epics
  const epics = await Promise.all(
    teams.map(team =>
      prisma.epic.create({
        data: {
          name: `${team.name} Q2 Goals`,
          teamId: team.id,
          createdById: managers[0].id,
          color: '#3B82F6',
        },
      }).then(e => ({ id: e.id, teamId: team.id }))
    )
  );

  // ============================================
  // Tasks (100+ tasks with varied data)
  // ============================================
  const taskTemplates = [
    { title: 'Implement authentication flow', type: 'story', priority: 'high' },
    { title: 'Fix login redirect bug', type: 'bug', priority: 'urgent' },
    { title: 'Create dashboard analytics widget', type: 'story', priority: 'medium' },
    { title: 'Optimize database query performance', type: 'task', priority: 'high' },
    { title: 'Add export to PDF feature', type: 'story', priority: 'medium' },
    { title: 'Fix notification delivery delay', type: 'bug', priority: 'high' },
    { title: 'Design new onboarding screens', type: 'story', priority: 'medium' },
    { title: 'Integrate payment gateway', type: 'story', priority: 'high' },
    { title: 'Setup CI/CD pipeline', type: 'task', priority: 'medium' },
    { title: 'Write API documentation', type: 'task', priority: 'low' },
    { title: 'Implement search functionality', type: 'story', priority: 'medium' },
    { title: 'Add dark mode support', type: 'story', priority: 'low' },
    { title: 'Create user profile page', type: 'story', priority: 'medium' },
    { title: 'Fix mobile responsive issues', type: 'bug', priority: 'high' },
    { title: 'Implement real-time updates', type: 'story', priority: 'high' },
    { title: 'Add file upload feature', type: 'story', priority: 'medium' },
    { title: 'Create admin panel', type: 'story', priority: 'high' },
    { title: 'Setup monitoring alerts', type: 'task', priority: 'medium' },
    { title: 'Implement caching layer', type: 'task', priority: 'high' },
    { title: 'Fix session timeout issue', type: 'bug', priority: 'urgent' },
    { title: 'Add email notification system', type: 'story', priority: 'medium' },
    { title: 'Create reporting dashboard', type: 'story', priority: 'high' },
    { title: 'Implement audit logging', type: 'task', priority: 'medium' },
    { title: 'Fix memory leak in worker', type: 'bug', priority: 'high' },
    { title: 'Add two-factor authentication', type: 'story', priority: 'high' },
  ];

  const statuses = ['todo', 'in_progress', 'review', 'done'];
  const statusWeights = [0.15, 0.25, 0.15, 0.45]; // 45% done for good completion rate

  const tasks: { id: string; teamId: string; status: string; assigneeId?: string }[] = [];
  
  for (let i = 0; i < 120; i++) {
    const team = teams[i % teams.length];
    const project = projects.find(p => p.teamId === team.id)!;
    const activeSprint = sprints.find(s => s.teamId === team.id && s.sprintNum === 0)!;
    const epic = epics.find(e => e.teamId === team.id)!;
    const template = taskTemplates[i % taskTemplates.length];
    
    const teamUserIds = teamMembers.filter(tm => tm.teamId === team.id).map(tm => tm.userId);
    const teamUsers = users.filter(u => teamUserIds.includes(u.id));
    const assignee = chance(0.85) ? pick(teamUsers) : null;
    
    // Weighted status selection
    const rand = Math.random();
    let status = statuses[0];
    let cumulative = 0;
    for (let s = 0; s < statuses.length; s++) {
      cumulative += statusWeights[s];
      if (rand < cumulative) {
        status = statuses[s];
        break;
      }
    }

    const dueDate = chance(0.7) ? daysFromNow(randInt(-14, 21)) : null;
    const isOverdue = dueDate && dueDate < now && status !== 'done';

    const task = await prisma.task.create({
      data: {
        title: `${template.title} #${i + 1}`,
        description: faker.lorem.paragraphs(2),
        status,
        priority: template.priority as string,
        issueType: template.type as string,
        teamId: team.id,
        assigneeId: assignee?.id,
        reporterId: pick(managers).id,
        projectId: project.id,
        sprintId: activeSprint.id,
        epicId: epic.id,
        dueDate,
        storyPoints: chance(0.6) ? pick([1, 2, 3, 5, 8, 13]) : null,
        estimate: chance(0.5) ? randInt(2, 40) : null,
        tags: chance(0.4) ? [pick(['frontend', 'backend', 'api', 'ui', 'database', 'security'])] : [],
        createdAt: daysAgo(randInt(1, 60)),
      },
    });
    tasks.push({ id: task.id, teamId: team.id, status: task.status, assigneeId: assignee?.id });
  }

  console.log(`   ✓ Created ${tasks.length} tasks`);

  // ============================================
  // Channels & Messages (richer communication)
  // ============================================
  const channelNames = ['general', 'announcements', 'engineering', 'random', 'standup'];
  const channels = await Promise.all(
    teams.flatMap(team =>
      channelNames.map(name =>
        prisma.channel.create({
          data: {
            teamId: team.id,
            name,
            type: name === 'announcements' ? 'announcement' : 'general',
            description: `${team.name} ${name}`,
          },
        }).then(c => ({ id: c.id, teamId: c.teamId, name: c.name }))
      )
    )
  );

  // Messages per channel (10-30 per channel)
  const messages: { id: string; channelId: string; senderId: string; createdAt: Date }[] = [];
  for (const channel of channels) {
    const teamUserIds = teamMembers.filter(tm => tm.teamId === channel.teamId).map(tm => tm.userId);
    const channelUsers = users.filter(u => teamUserIds.includes(u.id));
    const msgCount = randInt(15, 40);
    
    for (let m = 0; m < msgCount; m++) {
      const sender = pick(channelUsers);
      const msg = await prisma.message.create({
        data: {
          channelId: channel.id,
          senderId: sender.id,
          text: faker.lorem.sentences(randInt(1, 3)),
          createdAt: daysAgo(randInt(0, 30)),
        },
      });
      messages.push({ id: msg.id, channelId: msg.channelId, senderId: msg.senderId, createdAt: msg.createdAt });
    }
  }

  console.log(`   ✓ Created ${messages.length} messages`);

  // ============================================
  // Meetings (30+ meetings with history)
  // ============================================
  const meetingTypes = [
    { title: 'Daily Standup', duration: 15, recurring: true },
    { title: 'Sprint Planning', duration: 60, recurring: false },
    { title: 'Sprint Review', duration: 45, recurring: false },
    { title: 'Sprint Retrospective', duration: 30, recurring: false },
    { title: 'Design Review', duration: 30, recurring: false },
    { title: 'Technical Discussion', duration: 45, recurring: false },
    { title: 'Client Meeting', duration: 60, recurring: false },
    { title: 'Team Sync', duration: 20, recurring: true },
  ];

  const meetings: { id: string; teamId: string; hostId: string }[] = [];
  for (let i = 0; i < 35; i++) {
    const team = teams[i % teams.length];
    const type = meetingTypes[i % meetingTypes.length];
    const teamUserIds = teamMembers.filter(tm => tm.teamId === team.id).map(tm => tm.userId);
    const host = users.find(u => u.id === teamUserIds[0])!;
    
    const startHour = randInt(9, 17);
    const startTime = daysAgo(randInt(0, 30));
    startTime.setHours(startHour, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + type.duration * 60000);
    
    const isPast = startTime < now;
    const status = isPast ? 'ended' : 'scheduled';

    const meeting = await prisma.meeting.create({
      data: {
        title: `${type.title} - ${team.name}`,
        meetingCode: `meet-${faker.string.alphanumeric(8)}`,
        hostId: host.id,
        teamId: team.id,
        startTime,
        endTime,
        status,
        isRecurring: type.recurring,
      },
    });
    meetings.push({ id: meeting.id, teamId: team.id, hostId: host.id });

    // Add participants
    const participantCount = randInt(3, 8);
    const participants = users.filter(u => teamUserIds.includes(u.id)).slice(0, participantCount);
    await prisma.meetingParticipant.createMany({
      data: participants.map(p => ({
        meetingId: meeting.id,
        userId: p.id,
        role: p.id === host.id ? 'host' : 'participant',
        joinedAt: isPast ? startTime : undefined,
        leftAt: isPast ? endTime : undefined,
        duration: isPast ? type.duration * 60 : null,
      })),
      skipDuplicates: true,
    });
  }

  console.log(`   ✓ Created ${meetings.length} meetings`);

  // ============================================
  // Direct Messages
  // ============================================
  const dmCount = 80;
  for (let i = 0; i < dmCount; i++) {
    const sender = pick(users);
    let receiver = pick(users);
    while (receiver.id === sender.id) receiver = pick(users);

    await prisma.directMessage.create({
      data: {
        senderId: sender.id,
        receiverId: receiver.id,
        text: faker.lorem.sentences(randInt(1, 2)),
        createdAt: daysAgo(randInt(0, 14)),
      },
    });
  }

  console.log(`   ✓ Created ${dmCount} direct messages`);

  // ============================================
  // Task Activity Logs (for history tracking)
  // ============================================
  const activityActions = ['created', 'status_changed', 'assigned', 'priority_changed', 'due_date_set', 'comment_added'];
  const activityLogs: Prisma.TaskActivityLogCreateManyInput[] = [];
  
  tasks.slice(0, 80).forEach(task => {
    const logCount = randInt(2, 6);
    for (let l = 0; l < logCount; l++) {
      activityLogs.push({
        taskId: task.id,
        action: pick(activityActions),
        userId: task.assigneeId || pick(users).id,
        oldValue: l === 0 ? null : pick(['todo', 'in_progress', 'low', 'medium']),
        newValue: l === 0 ? 'created' : pick(['in_progress', 'review', 'done', 'high']),
        createdAt: daysAgo(randInt(0, 30)),
      });
    }
  });
  await prisma.taskActivityLog.createMany({ data: activityLogs });

  console.log(`   ✓ Created ${activityLogs.length} activity logs`);

  // ============================================
  // Time Entries (for productivity tracking)
  // ============================================
  const timeEntries: Prisma.TimeEntryCreateManyInput[] = [];
  tasks.filter(t => t.status === 'done' || t.status === 'review').forEach(task => {
    if (task.assigneeId && chance(0.7)) {
      const entryCount = randInt(1, 4);
      for (let e = 0; e < entryCount; e++) {
        const start = daysAgo(randInt(0, 14));
        start.setHours(randInt(9, 16), 0, 0, 0);
        const duration = randInt(1, 6) * 3600; // 1-6 hours in seconds
        timeEntries.push({
          userId: task.assigneeId!,
          taskId: task.id,
          startTime: start,
          endTime: new Date(start.getTime() + duration * 1000),
          duration,
          description: faker.lorem.sentence(),
          billable: chance(0.6),
        });
      }
    }
  });
  await prisma.timeEntry.createMany({ data: timeEntries });

  console.log(`   ✓ Created ${timeEntries.length} time entries`);

  // ============================================
  // Work Hours (for productivity score)
  // ============================================
  const workHours: Prisma.WorkHoursCreateManyInput[] = [];
  users.forEach(user => {
    // Last 30 days of work hours
    for (let d = 0; d < 30; d++) {
      if (chance(0.85)) { // 85% work days
        workHours.push({
          userId: user.id,
          date: daysAgo(d),
          hours: faker.number.float({ min: 6, max: 10, fractionDigits: 1 }),
          notes: chance(0.2) ? faker.lorem.sentence() : null,
        });
      }
    }
  });
  await prisma.workHours.createMany({ data: workHours, skipDuplicates: true });

  console.log(`   ✓ Created ${workHours.length} work hour records`);

  // ============================================
  // Message Reads & Reactions
  // ============================================
  const messageReads: Prisma.MessageReadCreateManyInput[] = [];
  messages.slice(0, 200).forEach(msg => {
    const channel = channels.find(c => c.id === msg.channelId)!;
    const teamUserIds = teamMembers.filter(tm => tm.teamId === channel.teamId).map(tm => tm.userId);
    const readers = users.filter(u => teamUserIds.includes(u.id)).slice(0, randInt(2, 6));
    readers.forEach(r => {
      messageReads.push({
        messageId: msg.id,
        userId: r.id,
        readAt: new Date(msg.createdAt.getTime() + randInt(1, 120) * 60000),
      });
    });
  });
  await prisma.messageRead.createMany({ data: messageReads, skipDuplicates: true });

  const reactions: Prisma.MessageReactionCreateManyInput[] = messages.slice(0, 150).map(msg => ({
    messageId: msg.id,
    userId: pick(users).id,
    emoji: pick(['👍', '❤️', '😂', '🎉', '👀', '🔥', '✅', '🙏']),
  }));
  await prisma.messageReaction.createMany({ data: reactions, skipDuplicates: true });

  // ============================================
  // Task Comments & Subtasks
  // ============================================
  const comments: Prisma.TaskCommentCreateManyInput[] = tasks.slice(0, 60).flatMap(task =>
    Array.from({ length: randInt(1, 4) }, () => ({
      taskId: task.id,
      userId: task.assigneeId || pick(users).id,
      text: faker.lorem.sentences(randInt(1, 3)),
      createdAt: daysAgo(randInt(0, 20)),
    }))
  );
  await prisma.taskComment.createMany({ data: comments });

  const subtasks: Prisma.SubtaskCreateManyInput[] = tasks.slice(0, 50).flatMap(task =>
    Array.from({ length: randInt(2, 5) }, (_, i) => ({
      taskId: task.id,
      title: faker.lorem.words(randInt(3, 6)),
      isCompleted: task.status === 'done' ? chance(0.9) : chance(0.3),
      position: i,
    }))
  );
  await prisma.subtask.createMany({ data: subtasks });

  // ============================================
  // Notifications
  // ============================================
  await prisma.notificationPreference.createMany({
    data: users.map(u => ({
      userId: u.id,
      mentionDelivery: 'realtime',
      taskAssignedDelivery: 'realtime',
      meetingStartingDelivery: 'realtime',
    })),
    skipDuplicates: true,
  });

  const notifs: Prisma.NotificationCreateManyInput[] = users.flatMap(u =>
    Array.from({ length: randInt(5, 15) }, () => ({
      userId: u.id,
      type: pick(['task_assigned', 'meeting_created', 'message_mention', 'task_updated', 'meeting_reminder']),
      title: faker.lorem.words(randInt(3, 6)),
      message: faker.lorem.sentence(),
      read: chance(0.6),
      createdAt: daysAgo(randInt(0, 14)),
    }))
  );
  await prisma.notification.createMany({ data: notifs });

  console.log(`   ✓ Created ${notifs.length} notifications`);

  // ============================================
  // Announcements
  // ============================================
  const announcements = await Promise.all([
    prisma.announcement.create({
      data: {
        title: 'ยินดีต้อนรับสู่ Team Connect!',
        content: 'ระบบพร้อมใช้งานแล้ว กรุณาอัปเดตโปรไฟล์และเริ่มใช้งานได้เลย',
        priority: 'high',
        targetType: 'all',
        targetIds: [],
        createdBy: users[0].id,
        status: 'active',
      },
    }).then(a => ({ id: a.id })),
    prisma.announcement.create({
      data: {
        title: 'ประกาศ: วันหยุดสงกรานต์',
        content: 'หยุด 13-15 เมษายน 2569',
        priority: 'normal',
        targetType: 'all',
        targetIds: [],
        createdBy: users[1].id,
        status: 'active',
      },
    }).then(a => ({ id: a.id })),
    prisma.announcement.create({
      data: {
        title: 'Sprint Review วันศุกร์',
        content: 'อัปเดต Task ก่อนศุกร์ 17:00 น.',
        priority: 'urgent',
        targetType: 'team',
        targetIds: teams.map(t => t.id),
        createdBy: managers[0].id,
        status: 'active',
      },
    }).then(a => ({ id: a.id })),
  ]);

  // Announcement reads
  await prisma.announcementRead.createMany({
    data: announcements.flatMap(a =>
      users.slice(0, 15).map(u => ({ announcementId: a.id, userId: u.id }))
    ),
    skipDuplicates: true,
  });

  // ============================================
  // Holidays
  // ============================================
  await prisma.holiday.createMany({
    data: [
      { name: 'วันสงกรานต์', nameEn: 'Songkran', date: new Date('2026-04-13'), type: 'public', country: 'TH', isRecurring: true, organizationId: org.id },
      { name: 'วันแรงงาน', nameEn: 'Labour Day', date: new Date('2026-05-01'), type: 'public', country: 'TH', isRecurring: true, organizationId: org.id },
      { name: 'วันฉัตรมงคล', nameEn: 'Coronation Day', date: new Date('2026-05-04'), type: 'public', country: 'TH', isRecurring: true, organizationId: org.id },
      { name: 'วันวิสาขบูชา', nameEn: 'Visakha Bucha', date: new Date('2026-05-12'), type: 'public', country: 'TH', isRecurring: true, organizationId: org.id },
    ],
  });

  // ============================================
  // Audit Logs
  // ============================================
  await prisma.auditLog.createMany({
    data: [
      { action: 'create', entity: 'organization', entityId: org.id, userId: users[0].id, userName: users[0].name, createdAt: daysAgo(60) },
      ...teams.map((t, i) => ({
        action: 'create' as const,
        entity: 'team' as const,
        entityId: t.id,
        userId: users[0].id,
        userName: users[0].name,
        createdAt: daysAgo(55 - i * 2),
      })),
      ...users.slice(0, 10).map((u, i) => ({
        action: 'create' as const,
        entity: 'user' as const,
        entityId: u.id,
        userId: users[0].id,
        userName: users[0].name,
        createdAt: daysAgo(50 - i * 3),
      })),
    ],
  });

  console.log('\n✅ Comprehensive seed completed!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   ${users.length} users across ${teams.length} teams`);
  console.log(`   ${tasks.length} tasks (with various statuses)`);
  console.log(`   ${meetings.length} meetings (with history)`);
  console.log(`   ${messages.length} messages in ${channels.length} channels`);
  console.log(`   ${activityLogs.length} activity logs`);
  console.log(`   ${timeEntries.length} time entries`);
  console.log(`   ${workHours.length} work hour records`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // ============================================
  // Additional Tables for Complete Data
  // ============================================
  console.log('\n📦 Seeding additional tables...');

  // Components
  const components = await Promise.all(
    teams.map(team =>
      prisma.component.create({
        data: { teamId: team.id, name: `${team.name} Core Module`, description: faker.lorem.sentence() },
      })
    )
  );
  console.log(`   ✓ Created ${components.length} components`);

  // Versions
  const versions = await Promise.all(
    teams.flatMap(team =>
      ['v1.0.0', 'v1.1.0', 'v2.0.0'].map(v =>
        prisma.version.create({
          data: { teamId: team.id, name: v, released: v !== 'v2.0.0', releaseDate: v === 'v2.0.0' ? null : daysAgo(randInt(5, 20)) },
        })
      )
    )
  );
  console.log(`   ✓ Created ${versions.length} versions`);

  // Task Workflow Statuses
  await prisma.taskWorkflowStatus.createMany({
    data: [
      { name: 'To Do', key: 'todo', color: '#64748b', category: 'todo', position: 1 },
      { name: 'In Progress', key: 'in_progress', color: '#2563eb', category: 'doing', position: 2 },
      { name: 'In Review', key: 'review', color: '#f59e0b', category: 'doing', position: 3 },
      { name: 'Done', key: 'done', color: '#16a34a', category: 'done', position: 4 },
      { name: 'Cancelled', key: 'cancelled', color: '#dc2626', category: 'done', position: 5 },
    ],
  });
  console.log('   ✓ Created task workflow statuses');

  // Task Templates
  await prisma.taskTemplate.createMany({
    data: teams.flatMap(team => [
      { name: 'Bug Report', title: 'Bug: ', content: '## Description\n## Steps to Reproduce\n## Expected\n## Actual', teamId: team.id, createdById: managers[0].id },
      { name: 'Feature Request', title: 'Feature: ', content: '## Problem\n## Solution\n## Impact', teamId: team.id, createdById: managers[0].id },
    ]),
  });
  console.log('   ✓ Created task templates');

  // Task Watchers
  const watchers: Prisma.TaskWatcherCreateManyInput[] = tasks.slice(0, 60).flatMap(t => {
    const watchUsers = users.filter(u => u.id !== t.assigneeId).slice(0, randInt(1, 3));
    return watchUsers.map(u => ({ taskId: t.id, userId: u.id }));
  });
  await prisma.taskWatcher.createMany({ data: watchers, skipDuplicates: true });
  console.log(`   ✓ Created ${watchers.length} task watchers`);

  // Issue Links
  const issueLinks: Prisma.IssueLinkCreateManyInput[] = tasks.slice(0, 40).map((t, i) => ({
    sourceId: t.id,
    targetId: tasks[i + 40]?.id ?? tasks[0].id,
    type: pick(['relates', 'blocks', 'duplicates', 'causes']),
  }));
  await prisma.issueLink.createMany({ data: issueLinks, skipDuplicates: true });
  console.log(`   ✓ Created ${issueLinks.length} issue links`);

  // Task Attachments
  const attachments: Prisma.TaskAttachmentCreateManyInput[] = tasks.slice(0, 50).map(t => ({
    taskId: t.id,
    userId: t.assigneeId || pick(users).id,
    name: pick(['design-mockup.pdf', 'requirements.docx', 'screenshot.png', 'data.xlsx']),
    url: `https://files.siamdigital.co.th/${faker.string.uuid()}`,
    mimeType: pick(['application/pdf', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    size: randInt(50000, 500000),
  }));
  await prisma.taskAttachment.createMany({ data: attachments });
  console.log(`   ✓ Created ${attachments.length} task attachments`);

  // Threads
  const threadRoots = messages.slice(0, 30);
  const threads = await Promise.all(
    threadRoots.map(msg =>
      prisma.thread.create({
        data: { messageId: msg.id, channelId: msg.channelId },
      }).then(t => ({ id: t.id, channelId: msg.channelId, rootId: msg.id }))
    )
  );
  console.log(`   ✓ Created ${threads.length} threads`);

  // Thread replies
  await Promise.all(
    threads.map(thread => {
      const channel = channels.find(c => c.id === thread.channelId)!;
      const teamUserIds = teamMembers.filter(tm => tm.teamId === channel.teamId).map(tm => tm.userId);
      const threadUsers = users.filter(u => teamUserIds.includes(u.id));
      return Array.from({ length: randInt(2, 5) }, () =>
        prisma.message.create({
          data: {
            channelId: thread.channelId,
            senderId: pick(threadUsers).id,
            text: faker.lorem.sentences(randInt(1, 2)),
            threadId: thread.id,
            replyToId: thread.rootId,
          },
        })
      );
    }).flat()
  );
  console.log('   ✓ Created thread replies');

  // Invites
  const invites: Prisma.InviteCreateManyInput[] = Array.from({ length: 10 }, (_, i) => ({
    email: `invited-user-${i + 1}@siamdigital.co.th`,
    token: faker.string.alphanumeric(32),
    invitedBy: pick(managers).id,
    organizationId: org.id,
    role: 'employee',
    expiresAt: daysFromNow(7),
    usedAt: chance(0.3) ? daysAgo(randInt(1, 5)) : null,
  }));
  await prisma.invite.createMany({ data: invites });
  console.log(`   ✓ Created ${invites.length} invites`);

  // Document Folders
  const docFolders = await Promise.all(
    teams.map(team =>
      prisma.documentFolder.create({
        data: { name: `${team.name} Documents`, teamId: team.id, createdBy: pick(managers).id },
      }).then(f => ({ id: f.id, teamId: team.id }))
    )
  );
  console.log(`   ✓ Created ${docFolders.length} document folders`);

  // Documents
  const documents = await Promise.all(
    docFolders.flatMap(folder =>
      Array.from({ length: 3 }, () =>
        prisma.document.create({
          data: {
            name: pick(['Project Requirements', 'Technical Spec', 'Meeting Notes', 'Design Document', 'API Reference']),
            folderId: folder.id,
            teamId: folder.teamId,
            fileUrl: `https://docs.siamdigital.co.th/${faker.string.uuid()}.pdf`,
            fileSize: randInt(50000, 500000),
            mimeType: 'application/pdf',
            createdBy: pick(managers).id,
          },
        }).then(d => ({ id: d.id, folderId: folder.id }))
      )
    )
  );
  console.log(`   ✓ Created ${documents.length} documents`);

  // Document Versions
  const docVersions: Prisma.DocumentVersionCreateManyInput[] = documents.flatMap(d =>
    Array.from({ length: 2 }, (__, v) => ({
      documentId: d.id,
      version: v + 1,
      fileUrl: `https://docs.siamdigital.co.th/${faker.string.uuid()}.pdf`,
      fileSize: randInt(50000, 500000),
      mimeType: 'application/pdf',
      createdBy: pick(users).id,
      changeNote: v === 0 ? 'Initial version' : 'Updated content',
    }))
  );
  await prisma.documentVersion.createMany({ data: docVersions });
  console.log(`   ✓ Created ${docVersions.length} document versions`);

  // Document Permissions
  const docPerms: Prisma.DocumentPermissionCreateManyInput[] = documents.flatMap(d => [
    { documentId: d.id, userId: pick(managers).id, permission: 'edit' },
    { documentId: d.id, userId: pick(users).id, permission: 'view' },
  ]);
  await prisma.documentPermission.createMany({ data: docPerms, skipDuplicates: true });
  console.log(`   ✓ Created ${docPerms.length} document permissions`);

  // Drive Entries
  const driveEntries: Prisma.DriveEntryCreateManyInput[] = teams.flatMap(team => [
    { name: 'Reports', path: '/', isFolder: true, teamId: team.id, createdById: pick(users).id },
    { name: 'Presentations', path: '/', isFolder: true, teamId: team.id, createdById: pick(users).id },
    { name: 'Q1-Report.xlsx', path: '/Reports/', isFolder: false, teamId: team.id, createdById: pick(users).id },
    { name: 'Roadmap.pptx', path: '/Presentations/', isFolder: false, teamId: team.id, createdById: pick(users).id },
  ]);
  await prisma.driveEntry.createMany({ data: driveEntries });
  console.log(`   ✓ Created ${driveEntries.length} drive entries`);

  // Reminders
  const reminders = await Promise.all(
    users.slice(0, 12).map(u =>
      prisma.reminder.create({
        data: {
          title: pick(['Weekly review', 'Sprint planning prep', 'Update timesheet', 'Team sync notes']),
          description: faker.lorem.sentence(),
          type: pick(['task', 'meeting', 'custom']),
          remindAt: daysFromNow(randInt(1, 7)),
          createdBy: u.id,
        },
      }).then(r => ({ id: r.id }))
    )
  );
  console.log(`   ✓ Created ${reminders.length} reminders`);

  // Reminder Recipients
  const reminderRecipients: Prisma.ReminderRecipientCreateManyInput[] = reminders.map(r => ({
    reminderId: r.id,
    userId: pick(users).id,
  }));
  await prisma.reminderRecipient.createMany({ data: reminderRecipients });
  console.log(`   ✓ Created ${reminderRecipients.length} reminder recipients`);

  // Meeting Reminders
  const meetingReminders: Prisma.MeetingReminderCreateManyInput[] = meetings.slice(0, 20).map(m => ({
    meetingId: m.id,
    userId: pick(users).id,
    minutesBefore: pick([5, 15, 30]),
  }));
  await prisma.meetingReminder.createMany({ data: meetingReminders, skipDuplicates: true });
  console.log(`   ✓ Created ${meetingReminders.length} meeting reminders`);

  // Meeting Minutes
  const meetingMinutes: Prisma.MeetingMinutesCreateManyInput[] = meetings.slice(0, 15).map(m => ({
    meetingId: m.id,
    title: `Minutes - ${faker.lorem.words(3)}`,
    content: faker.lorem.paragraphs(5),
    actionItems: JSON.stringify([
      { task: 'Follow up with client', assignee: pick(users).name, dueDate: daysFromNow(3).toISOString() },
      { task: 'Update documentation', assignee: pick(users).name, dueDate: daysFromNow(5).toISOString() },
    ]),
    decisions: JSON.stringify(['Approved new feature scope', 'Budget allocated for Q2']),
    attendees: users.slice(0, 5).map(u => u.id),
    createdBy: pick(managers).id,
  }));
  await prisma.meetingMinutes.createMany({ data: meetingMinutes });
  console.log(`   ✓ Created ${meetingMinutes.length} meeting minutes`);

  // Wiki Articles
  const wikiArticles = await Promise.all(
    teams.flatMap(team =>
      Array.from({ length: 2 }, () =>
        prisma.wikiArticle.create({
          data: {
            title: pick(['Getting Started', 'Team Guidelines', 'Coding Standards', 'Deployment Process']),
            content: faker.lorem.paragraphs(10),
            teamId: team.id,
            createdBy: pick(managers).id,
          },
        }).then(a => ({ id: a.id, teamId: team.id }))
      )
    )
  );
  console.log(`   ✓ Created ${wikiArticles.length} wiki articles`);

  // Wiki Article Versions
  const wikiVersions: Prisma.WikiArticleVersionCreateManyInput[] = wikiArticles.flatMap(a =>
    Array.from({ length: 2 }, (_, v) => ({
      articleId: a.id,
      title: `Version ${v + 1}`,
      content: faker.lorem.paragraphs(8),
      version: v + 1,
      createdBy: pick(users).id,
    }))
  );
  await prisma.wikiArticleVersion.createMany({ data: wikiVersions });
  console.log(`   ✓ Created ${wikiVersions.length} wiki article versions`);

  // Wiki Comments
  const wikiComments: Prisma.WikiCommentCreateManyInput[] = wikiArticles.flatMap(a =>
    Array.from({ length: randInt(1, 3) }, () => ({
      articleId: a.id,
      content: faker.lorem.sentences(2),
      createdBy: pick(users).id,
    }))
  );
  await prisma.wikiComment.createMany({ data: wikiComments });
  console.log(`   ✓ Created ${wikiComments.length} wiki comments`);

  // Notification Digests
  const digests: Prisma.NotificationDigestCreateManyInput[] = users.slice(0, 10).map(u => ({
    userId: u.id,
    digestType: pick(['hourly', 'daily', 'weekly']),
    periodStart: daysAgo(1),
    periodEnd: now,
    byType: { task: randInt(1, 5), meeting: randInt(1, 3), message: randInt(2, 8) },
    highlights: JSON.stringify(['Task assigned', 'Meeting scheduled', 'New message']),
    notificationIds: [],
    sentAt: hoursAgo(randInt(1, 12)),
  }));
  await prisma.notificationDigest.createMany({ data: digests });
  console.log(`   ✓ Created ${digests.length} notification digests`);

  console.log('\n✅ All tables seeded successfully!');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
