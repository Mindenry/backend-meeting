import { PrismaClient, Prisma } from '@prisma/client';
import { fakerTH as faker } from '@faker-js/faker';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
faker.seed(20260331);

const now = new Date();
const passwordHash = bcrypt.hashSync('password123', 10);

// Helper functions
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const chance = (p: number) => Math.random() < p;

async function main() {
  console.log('🌱 Seeding database...');

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
          {
            name: 'Engineering',
            positions: ['CTO', 'Technical Lead', 'Senior Frontend Developer', 'Senior Backend Developer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Mobile Developer'],
          },
          {
            name: 'Design & UX',
            positions: ['Design Director', 'UX Lead', 'UI Designer', 'UX Designer', 'Graphic Designer'],
          },
          {
            name: 'Product',
            positions: ['Product Director', 'Product Manager', 'Product Owner', 'Business Analyst'],
          },
          {
            name: 'QA',
            positions: ['QA Lead', 'QA Engineer', 'Test Engineer'],
          },
          {
            name: 'DevOps & Infrastructure',
            positions: ['DevOps Lead', 'DevOps Engineer', 'Site Reliability Engineer', 'Cloud Engineer'],
          },
          {
            name: 'Project Management',
            positions: ['PM Director', 'Project Manager', 'Scrum Master'],
          },
          {
            name: 'Marketing',
            positions: ['Marketing Manager', 'Content Writer', 'SEO Specialist'],
          },
          {
            name: 'Human Resources',
            positions: ['HR Manager', 'Recruiter', 'HR Specialist'],
          },
        ],
      },
    },
  });

  const rolePermissions: Prisma.RolePermissionCreateManyInput[] = [
    { organizationId: org.id, role: 'org_owner', resource: 'all', action: 'manage', allowed: true },
    { organizationId: org.id, role: 'admin', resource: 'users', action: 'manage', allowed: true },
    { organizationId: org.id, role: 'admin', resource: 'teams', action: 'manage', allowed: true },
    { organizationId: org.id, role: 'manager', resource: 'tasks', action: 'manage', allowed: true },
    { organizationId: org.id, role: 'manager', resource: 'meetings', action: 'manage', allowed: true },
    { organizationId: org.id, role: 'employee', resource: 'tasks', action: 'view', allowed: true },
    { organizationId: org.id, role: 'employee', resource: 'meetings', action: 'view', allowed: true },
  ];
  await prisma.rolePermission.createMany({ data: rolePermissions });

  // ============================================
  // Users (12 users total)
  // ============================================
  const userData = [
    { name: 'ธีรภัทร์ วัฒนกุล', email: 'teerapat@siamdigital.co.th', role: 'org_owner', dept: 'Engineering', pos: 'CTO' },
    { name: 'กัญญา ศรีสุข', email: 'kanya@siamdigital.co.th', role: 'admin', dept: 'Project Management', pos: 'Project Manager' },
    { name: 'ภูวดล จิรากุล', email: 'phuwadon@siamdigital.co.th', role: 'manager', dept: 'Engineering', pos: 'Technical Lead' },
    { name: 'อริษา เทควงศ์', email: 'arisa@siamdigital.co.th', role: 'manager', dept: 'Design & UX', pos: 'Design Director' },
    { name: 'ณัฐพงษ์ ประภาษ', email: 'nattapong@siamdigital.co.th', role: 'employee', dept: 'Engineering', pos: 'Senior Frontend Developer' },
    { name: 'พัชรา ลิ้มวงศ์', email: 'patchara@siamdigital.co.th', role: 'employee', dept: 'Engineering', pos: 'Backend Developer' },
    { name: 'ธนกฤต มั่นคง', email: 'thanakrit@siamdigital.co.th', role: 'employee', dept: 'Product', pos: 'Business Analyst' },
    { name: 'พิมพ์ชนก รัตน์', email: 'pimchanok@siamdigital.co.th', role: 'employee', dept: 'QA', pos: 'QA Engineer' },
    { name: 'วิภา สุขสันต์', email: 'wipa@siamdigital.co.th', role: 'employee', dept: 'Design & UX', pos: 'UI Designer' },
    { name: 'ธีรพงษ์ แก้วใส', email: 'teerapong@siamdigital.co.th', role: 'employee', dept: 'Engineering', pos: 'Frontend Developer' },
    { name: 'สุดาวรรณ พงษ์ไพบูลย์', email: 'sudawan@siamdigital.co.th', role: 'employee', dept: 'Product', pos: 'Product Owner' },
    { name: 'อนันต์ ชัยมงคล', email: 'anan@siamdigital.co.th', role: 'employee', dept: 'DevOps & Infrastructure', pos: 'DevOps Engineer' },
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
          activity: pick(['Available', 'In a meeting', 'Deep work', 'On break']),
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`,
          isActive: true,
          department: u.dept,
          position: u.pos,
          organizationId: org.id,
          createdAt: new Date(2024, i, 1),
        },
      }).then(user => ({ id: user.id, name: user.name, email: user.email, role: user.role, dept: u.dept }))
    )
  );

  // Set manager relationships
  const managers = users.filter(u => u.role === 'manager' || u.role === 'org_owner' || u.role === 'admin');
  await Promise.all(
    users
      .filter(u => u.role === 'employee')
      .map(u => prisma.user.update({ where: { id: u.id }, data: { managerId: pick(managers).id } }))
  );

  // ============================================
  // Teams (3 teams)
  // ============================================
  const teamData = [
    { name: 'Platform Team', desc: 'Backend & Infrastructure' },
    { name: 'Product Team', desc: 'Frontend & Mobile Apps' },
    { name: 'Design Team', desc: 'UX/UI Design & Research' },
  ];

  const teams = await Promise.all(
    teamData.map(t =>
      prisma.team.create({
        data: {
          name: t.name,
          description: t.desc,
          organizationId: org.id,
        },
      }).then(team => ({ id: team.id, name: team.name }))
    )
  );

  // Team members
  const teamMembers: Prisma.TeamMemberCreateManyInput[] = [];
  teams.forEach((team, i) => {
    const teamUsers = users.slice(i * 4, i * 4 + 5);
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
  // Projects & Related (per team)
  // ============================================
  const projectData = [
    { key: 'PLAT', name: 'Platform Core' },
    { key: 'PROD', name: 'Product Portal' },
    { key: 'DSGN', name: 'Design System' },
  ];

  const [projects, components, versions, sprints, epics] = await Promise.all([
    Promise.all(
      teams.map((team, i) =>
        prisma.project.create({
          data: {
            teamId: team.id,
            key: projectData[i].key,
            name: `${projectData[i].name} - ${team.name}`,
            color: ['#3B82F6', '#10B981', '#8B5CF6'][i],
          },
        }).then(p => ({ id: p.id, teamId: team.id, key: p.key, name: p.name }))
      )
    ),
    Promise.all(
      teams.map(team =>
        prisma.component.create({
          data: { teamId: team.id, name: `${team.name} Core` },
        }).then(c => ({ id: c.id, teamId: team.id }))
      )
    ),
    Promise.all(
      teams.map(team =>
        prisma.version.create({
          data: { teamId: team.id, name: 'v1.0.0', released: true },
        }).then(v => ({ id: v.id, teamId: team.id }))
      )
    ),
    Promise.all(
      teams.map(team =>
        prisma.sprint.create({
          data: {
            name: `${team.name} Sprint 1`,
            teamId: team.id,
            createdById: managers[0].id,
            startDate: new Date(2026, 3, 1),
            endDate: new Date(2026, 3, 14),
            status: 'active',
          },
        }).then(s => ({ id: s.id, teamId: team.id }))
      )
    ),
    Promise.all(
      teams.map(team =>
        prisma.epic.create({
          data: {
            name: `${team.name} MVP`,
            teamId: team.id,
            createdById: managers[0].id,
            color: '#3B82F6',
          },
        }).then(e => ({ id: e.id, teamId: team.id }))
      )
    ),
  ]);

  // ============================================
  // Tasks (6 tasks per team = 18 total)
  // ============================================
  const taskTitles = [
    'Implement user authentication flow',
    'Create dashboard analytics widget',
    'Fix notification delivery delay',
    'Add export to PDF feature',
    'Optimize database query performance',
    'Design new onboarding screens',
    'Integrate payment gateway',
    'Setup CI/CD pipeline',
    'Write API documentation',
    'Implement search functionality',
    'Add dark mode support',
    'Create user profile page',
    'Fix mobile responsive issues',
    'Implement real-time updates',
    'Add file upload feature',
    'Create admin panel',
    'Setup monitoring alerts',
    'Implement caching layer',
  ];

  const tasks = await Promise.all(
    taskTitles.slice(0, 18).map((title, i) => {
      const team = teams[i % 3];
      const project = projects.find(p => p.teamId === team.id)!;
      const sprint = sprints.find(s => s.teamId === team.id)!;
      const epic = epics.find(e => e.teamId === team.id)!;
      const component = components.find(c => c.teamId === team.id)!;
      const version = versions.find(v => v.teamId === team.id)!;
      const teamUserIds = teamMembers.filter(tm => tm.teamId === team.id).map(tm => tm.userId);
      const assignee = pick(users.filter(u => teamUserIds.includes(u.id)));

      return prisma.task.create({
        data: {
          title,
          description: faker.lorem.paragraph(),
          status: pick(['todo', 'in_progress', 'review', 'done']),
          priority: pick(['low', 'medium', 'high']),
          issueType: pick(['task', 'bug', 'story']),
          teamId: team.id,
          assigneeId: assignee?.id,
          reporterId: managers[0].id,
          projectId: project.id,
          sprintId: sprint.id,
          epicId: epic.id,
          componentId: component.id,
          versionId: version.id,
          dueDate: new Date(2026, 3, 15 + i),
        },
      }).then(t => ({ id: t.id, teamId: team.id, status: t.status }));
    })
  );

  // ============================================
  // Channels & Messages (reduced: 2 channels per team)
  // ============================================
  const channelNames = ['general', 'announcements'];
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

  // Messages per channel (reduced: 2-3 messages per channel)
  const MESSAGES: Record<string, string[]> = {
    general: [
      'สวัสดีครับ วันนี้มีอะไรให้ช่วยไหมครับ?',
      'Reminder: วันนี้ 17:00 มี team meeting ครับ',
    ],
    announcements: [
      '📢 ประกาศ: พรุ่งนี้จะมีการ deploy version ใหม่ครับ',
      '🎉 ยินดีด้วย! Sprint นี้เราผ่านเป้าหมายแล้ว',
    ],
  };

  const messages = await Promise.all(
    channels.flatMap(channel => {
      const pool = MESSAGES[channel.name] || MESSAGES.general;
      const teamUserIds = teamMembers.filter(tm => tm.teamId === channel.teamId).map(tm => tm.userId);
      const channelUsers = users.filter(u => teamUserIds.includes(u.id));

      // Reduced: 2 messages per channel
      return Array.from({ length: 2 }, (_, i) => {
        const sender = pick(channelUsers);
        return prisma.message.create({
          data: {
            channelId: channel.id,
            senderId: sender.id,
            text: pool[i % pool.length],
          },
        }).then(m => ({ id: m.id, channelId: m.channelId, senderId: m.senderId, createdAt: m.createdAt }));
      });
    })
  );

  // ============================================
  // Meetings (3 meetings)
  // ============================================
  const meetings = await Promise.all([
    prisma.meeting.create({
      data: {
        title: 'Daily Standup',
        meetingCode: 'standup-001',
        hostId: managers[0].id,
        teamId: teams[0].id,
        startTime: new Date(now.getTime() - 3600000),
        endTime: new Date(now.getTime() - 3000000),
        status: 'ended',
      },
    }).then(m => ({ id: m.id, teamId: teams[0].id })),
    prisma.meeting.create({
      data: {
        title: 'Sprint Planning',
        meetingCode: 'plan-001',
        hostId: managers[1].id,
        teamId: teams[1].id,
        startTime: new Date(now.getTime() + 3600000),
        status: 'scheduled',
      },
    }).then(m => ({ id: m.id, teamId: teams[1].id })),
    prisma.meeting.create({
      data: {
        title: 'Design Review',
        meetingCode: 'design-001',
        hostId: managers[2].id,
        teamId: teams[2].id,
        startTime: new Date(now.getTime() + 7200000),
        status: 'scheduled',
      },
    }).then(m => ({ id: m.id, teamId: teams[2].id })),
  ]);

  // ============================================
  // Meeting Participants
  // ============================================
  const meetingParticipants: Prisma.MeetingParticipantCreateManyInput[] = meetings.flatMap(meeting => {
    const teamUserIds = teamMembers.filter(tm => tm.teamId === meeting.teamId).map(tm => tm.userId);
    const participants = users.filter(u => teamUserIds.includes(u.id)).slice(0, 4);
    return participants.map(u => ({
      meetingId: meeting.id,
      userId: u.id,
      role: chance(0.3) ? 'host' : 'participant',
      joinedAt: new Date(),
    }));
  });
  await prisma.meetingParticipant.createMany({ data: meetingParticipants, skipDuplicates: true });

  // ============================================
  // Direct Messages
  // ============================================
  const dmPairs = [[users[0], users[4]], [users[1], users[5]], [users[2], users[6]]];
  await Promise.all(
    dmPairs.flatMap(([sender, receiver]) =>
      Array.from({ length: 3 }, () =>
        prisma.directMessage.create({
          data: {
            senderId: sender.id,
            receiverId: receiver.id,
            text: faker.lorem.sentence(),
          },
        })
      )
    )
  );

  // ============================================
  // Threads & Thread Replies
  // ============================================
  const threadRoots = messages.slice(0, 6);
  const threads = await Promise.all(
    threadRoots.map(root =>
      prisma.thread.create({
        data: { messageId: root.id, channelId: root.channelId },
      }).then(t => ({ id: t.id, channelId: root.channelId, rootId: root.id }))
    )
  );

  // Thread replies
  await Promise.all(
    threads.map(thread => {
      const channel = channels.find(c => c.id === thread.channelId)!;
      const teamUserIds = teamMembers.filter(tm => tm.teamId === channel.teamId).map(tm => tm.userId);
      const threadUsers = users.filter(u => teamUserIds.includes(u.id));
      return Array.from({ length: 2 }, () =>
        prisma.message.create({
          data: {
            channelId: thread.channelId,
            senderId: pick(threadUsers).id,
            text: faker.lorem.sentence(),
            threadId: thread.id,
            replyToId: thread.rootId,
          },
        })
      );
    })
  );

  // ============================================
  // Message Reads & Reactions
  // ============================================
  const messageReads: Prisma.MessageReadCreateManyInput[] = messages.slice(0, 20).flatMap(msg => {
    const channel = channels.find(c => c.id === msg.channelId)!;
    const teamUserIds = teamMembers.filter(tm => tm.teamId === channel.teamId).map(tm => tm.userId);
    return users.filter(u => teamUserIds.includes(u.id)).slice(0, 3).map(u => ({
      messageId: msg.id,
      userId: u.id,
    }));
  });
  await prisma.messageRead.createMany({ data: messageReads, skipDuplicates: true });

  const reactions: Prisma.MessageReactionCreateManyInput[] = messages.slice(0, 15).map(msg => ({
    messageId: msg.id,
    userId: pick(users).id,
    emoji: pick(['👍', '❤️', '😂', '🎉', '👀']),
  }));
  await prisma.messageReaction.createMany({ data: reactions, skipDuplicates: true });

  // ============================================
  // Task Comments, Subtasks, Attachments
  // ============================================
  const taskComments: Prisma.TaskCommentCreateManyInput[] = tasks.slice(0, 12).map(t => ({
    taskId: t.id,
    userId: pick(users).id,
    text: faker.lorem.sentence(),
  }));
  await prisma.taskComment.createMany({ data: taskComments });

  const subtasks: Prisma.SubtaskCreateManyInput[] = tasks.slice(0, 10).flatMap(t => [
    { taskId: t.id, title: 'Research requirements', isCompleted: true },
    { taskId: t.id, title: 'Implementation', isCompleted: false },
  ]);
  await prisma.subtask.createMany({ data: subtasks });

  const attachments: Prisma.TaskAttachmentCreateManyInput[] = tasks.slice(0, 8).map(t => ({
    taskId: t.id,
    userId: pick(users).id,
    name: 'design-mockup.pdf',
    url: `https://files.siamdigital.co.th/${faker.string.uuid()}.pdf`,
    mimeType: 'application/pdf',
    size: 102400,
  }));
  await prisma.taskAttachment.createMany({ data: attachments });

  // ============================================
  // Task Activity Log
  // ============================================
  const taskLogs: Prisma.TaskActivityLogCreateManyInput[] = tasks.slice(0, 15).map(t => ({
    taskId: t.id,
    action: pick(['created', 'status_changed', 'assigned', 'comment_added']),
    userId: pick(users).id,
  }));
  await prisma.taskActivityLog.createMany({ data: taskLogs });

  // ============================================
  // Time Entries
  // ============================================
  const timeEntries: Prisma.TimeEntryCreateManyInput[] = tasks.slice(0, 10).map(t => {
    const start = faker.date.recent({ days: 7, refDate: now });
    const end = new Date(start.getTime() + 3600000 * faker.number.int({ min: 1, max: 8 }));
    return {
      userId: pick(users).id,
      taskId: t.id,
      startTime: start,
      endTime: end,
      description: faker.lorem.sentence(),
    };
  });
  await prisma.timeEntry.createMany({ data: timeEntries });

  // ============================================
  // Invites
  // ============================================
  const invites: Prisma.InviteCreateManyInput[] = [
    { email: 'newuser1@siamdigital.co.th', token: faker.string.alphanumeric(32), invitedBy: users[0].id, organizationId: org.id, expiresAt: new Date(now.getTime() + 86400000 * 7) },
    { email: 'newuser2@siamdigital.co.th', token: faker.string.alphanumeric(32), invitedBy: users[1].id, organizationId: org.id, expiresAt: new Date(now.getTime() + 86400000 * 7) },
  ];
  await prisma.invite.createMany({ data: invites });

  // ============================================
  // Refresh Tokens
  // ============================================
  const refreshTokens: Prisma.RefreshTokenCreateManyInput[] = users.slice(0, 8).map(u => ({
    userId: u.id,
    token: faker.string.alphanumeric(64),
    expiresAt: new Date(now.getTime() + 86400000 * 30),
  }));
  await prisma.refreshToken.createMany({ data: refreshTokens });

  // ============================================
  // Documents & Folders
  // ============================================
  const folders = await Promise.all(
    teams.map(team =>
      prisma.documentFolder.create({
        data: { name: `${team.name} Documents`, teamId: team.id, createdBy: pick(users).id },
      }).then(f => ({ id: f.id, teamId: team.id }))
    )
  );

  const documents = await Promise.all(
    folders.map(folder =>
      prisma.document.create({
        data: {
          name: 'Project Requirements',
          folderId: folder.id,
          teamId: folder.teamId,
          fileUrl: `https://docs.siamdigital.co.th/${faker.string.uuid()}.pdf`,
          fileSize: 102400,
          mimeType: 'application/pdf',
          createdBy: pick(managers).id,
        },
      }).then(d => ({ id: d.id, folderId: folder.id }))
    )
  );

  // Document versions
  const docVersions: Prisma.DocumentVersionCreateManyInput[] = documents.map(d => ({
    documentId: d.id,
    version: 1,
    fileUrl: `https://docs.siamdigital.co.th/${faker.string.uuid()}.pdf`,
    fileSize: 102400,
    mimeType: 'application/pdf',
    createdBy: pick(users).id,
  }));
  await prisma.documentVersion.createMany({ data: docVersions });

  // Document permissions
  const docPerms: Prisma.DocumentPermissionCreateManyInput[] = documents.flatMap(d => [
    { documentId: d.id, userId: pick(users).id, permission: 'edit' },
    { documentId: d.id, userId: pick(users).id, permission: 'view' },
  ]);
  await prisma.documentPermission.createMany({ data: docPerms, skipDuplicates: true });

  // ============================================
  // Drive Entries
  // ============================================
  const driveEntries: Prisma.DriveEntryCreateManyInput[] = teams.flatMap(team => [
    { name: 'Reports', path: '/', isFolder: true, teamId: team.id, createdById: pick(users).id },
    { name: 'presentation.pptx', path: '/', isFolder: false, teamId: team.id, createdById: pick(users).id },
  ]);
  await prisma.driveEntry.createMany({ data: driveEntries });

  // ============================================
  // Reminders
  // ============================================
  const reminders = await Promise.all(
    users.slice(0, 6).map(u =>
      prisma.reminder.create({
        data: {
          title: 'Weekly review',
          description: 'Review weekly progress',
          type: 'general',
          remindAt: new Date(now.getTime() + 86400000 * 2),
          createdBy: u.id,
        },
      }).then(r => ({ id: r.id }))
    )
  );

  const reminderRecipients: Prisma.ReminderRecipientCreateManyInput[] = reminders.map(r => ({
    reminderId: r.id,
    userId: pick(users).id,
  }));
  await prisma.reminderRecipient.createMany({ data: reminderRecipients });

  // Meeting reminders
  const meetingReminders: Prisma.MeetingReminderCreateManyInput[] = meetings.map(m => ({
    meetingId: m.id,
    userId: pick(users).id,
    minutesBefore: 15,
  }));
  await prisma.meetingReminder.createMany({ data: meetingReminders });

  // ============================================
  // Holidays
  // ============================================
  await prisma.holiday.createMany({
    data: [
      { name: 'วันสงกรานต์', nameEn: 'Songkran', date: new Date('2026-04-13'), type: 'public', country: 'TH', isRecurring: true, organizationId: org.id },
      { name: 'วันแรงงาน', nameEn: 'Labour Day', date: new Date('2026-05-01'), type: 'public', country: 'TH', isRecurring: true, organizationId: org.id },
    ],
  });

  // ============================================
  // Work Hours
  // ============================================
  const workHours: Prisma.WorkHoursCreateManyInput[] = users.slice(0, 8).flatMap(u =>
    Array.from({ length: 3 }, () => ({
      userId: u.id,
      date: faker.date.recent({ days: 7, refDate: now }),
      hours: faker.number.float({ min: 6, max: 10, fractionDigits: 1 }),
    }))
  );
  await prisma.workHours.createMany({ data: workHours });

  // ============================================
  // Task Templates
  // ============================================
  const taskTemplates: Prisma.TaskTemplateCreateManyInput[] = teams.map(team => ({
    name: 'Bug Report Template',
    title: 'Bug: ',
    content: 'Steps to reproduce, expected behavior, actual behavior',
    teamId: team.id,
    createdById: pick(managers).id,
  }));
  await prisma.taskTemplate.createMany({ data: taskTemplates });

  // ============================================
  // Workflow Statuses
  // ============================================
  await prisma.taskWorkflowStatus.createMany({
    data: [
      { name: 'To Do', key: 'todo', color: '#64748b', category: 'todo', position: 1 },
      { name: 'In Progress', key: 'in_progress', color: '#2563eb', category: 'doing', position: 2 },
      { name: 'Done', key: 'done', color: '#16a34a', category: 'done', position: 3 },
    ],
  });

  // ============================================
  // Wiki Articles
  // ============================================
  await Promise.all(
    teams.map(team =>
      prisma.wikiArticle.create({
        data: {
          title: 'Team Guidelines',
          content: faker.lorem.paragraphs(5),
          teamId: team.id,
          createdBy: pick(managers).id,
        },
      })
    )
  );

  // ============================================
  // Issue Links
  // ============================================
  const issueLinks: Prisma.IssueLinkCreateManyInput[] = tasks.slice(0, 6).map((t, i) => ({
    sourceId: t.id,
    targetId: tasks[i + 6]?.id ?? tasks[0].id,
    type: pick(['relates', 'blocks', 'duplicates']),
  }));
  await prisma.issueLink.createMany({ data: issueLinks, skipDuplicates: true });

  // ============================================
  // Task Watchers
  // ============================================
  const watchers: Prisma.TaskWatcherCreateManyInput[] = tasks.slice(0, 10).flatMap(t => [
    { taskId: t.id, userId: pick(users).id },
    { taskId: t.id, userId: pick(users).id },
  ]);
  await prisma.taskWatcher.createMany({ data: watchers, skipDuplicates: true });

  // ============================================
  // Notification Digests
  // ============================================
  const digests: Prisma.NotificationDigestCreateManyInput[] = users.slice(0, 6).map(u => ({
    userId: u.id,
    digestType: 'daily',
    periodStart: faker.date.recent({ days: 1, refDate: now }),
    periodEnd: now,
    byType: { task: 2, meeting: 1 },
    highlights: ['Task assigned', 'Meeting scheduled'],
    sentAt: faker.date.recent({ days: 1, refDate: now }),
  }));
  await prisma.notificationDigest.createMany({ data: digests });

  // ============================================
  // Notifications & Preferences
  // ============================================
  await prisma.notificationPreference.createMany({
    data: users.map(u => ({
      userId: u.id,
      mentionDelivery: 'realtime',
      taskAssignedDelivery: 'realtime',
      meetingStartingDelivery: 'realtime',
    })),
  });

  const notifData: Prisma.NotificationCreateManyInput[] = users.flatMap(u => [
    { userId: u.id, type: 'task_assigned', title: 'Task Assigned', message: 'You have been assigned a new task' },
    { userId: u.id, type: 'meeting_created', title: 'Meeting Created', message: 'A new meeting has been scheduled' },
  ]);
  await prisma.notification.createMany({ data: notifData });

  // ============================================
  // Announcements
  // ============================================
  const announcements = await Promise.all([
    prisma.announcement.create({
      data: {
        title: 'ยินดีต้อนรับสู่ Team Connect!',
        content: 'ระบบ Team Connect พร้อมใช้งานแล้ว กรุณาอัปเดตโปรไฟล์ของคุณและเริ่มต้นใช้งานได้เลยครับ',
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
        content: 'บริษัทจะหยุดทำการ วันที่ 13-15 เมษายน 2569 เนื่องในเทศกาลสงกรานต์ ขอให้สนุกกับวันหยุดครับ!',
        priority: 'normal',
        targetType: 'all',
        targetIds: [],
        createdBy: users[1].id,
        status: 'active',
      },
    }).then(a => ({ id: a.id })),
    prisma.announcement.create({
      data: {
        title: 'Sprint Review สิ้นสุดวันศุกร์',
        content: 'กรุณาอัปเดตสถานะ Task ทั้งหมดก่อนวันศุกร์ 17:00 น. เพื่อทำ Sprint Review ครับ',
        priority: 'urgent',
        targetType: 'team',
        targetIds: [teams[0].id, teams[1].id],
        createdBy: managers[0].id,
        status: 'active',
      },
    }).then(a => ({ id: a.id })),
  ]);

  // Announcement reads
  const announcementReads: Prisma.AnnouncementReadCreateManyInput[] = announcements.flatMap(a =>
    users.slice(0, 6).map(u => ({
      announcementId: a.id,
      userId: u.id,
    }))
  );
  await prisma.announcementRead.createMany({ data: announcementReads, skipDuplicates: true });

  // ============================================
  // Audit Logs
  // ============================================
  await prisma.auditLog.createMany({
    data: [
      { action: 'create', entity: 'organization', entityId: org.id, userId: users[0].id, userName: users[0].name },
      { action: 'create', entity: 'team', entityId: teams[0].id, userId: users[0].id, userName: users[0].name },
      { action: 'update', entity: 'user', entityId: users[1].id, userId: users[0].id, userName: users[0].name },
    ],
  });

  console.log('✅ Seed completed successfully!');
  console.log(`   - ${users.length} users`);
  console.log(`   - ${teams.length} teams`);
  console.log(`   - ${projects.length} projects`);
  console.log(`   - ${tasks.length} tasks`);
  console.log(`   - ${channels.length} channels`);
  console.log(`   - ${messages.length} messages`);
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
