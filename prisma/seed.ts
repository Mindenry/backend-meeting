import { PrismaClient, Prisma } from '@prisma/client';
import { fakerTH as faker } from '@faker-js/faker';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

faker.seed(20260331);

const ROLE_DISTRIBUTION = ['org_owner', 'admin', 'manager', 'employee'] as const;
const USER_STATUS = ['online', 'busy', 'away', 'offline'] as const;
const TASK_STATUS = ['todo', 'in_progress', 'review', 'done'] as const;
const TASK_PRIORITY = ['low', 'medium', 'high', 'urgent'] as const;
const ISSUE_TYPES = ['task', 'bug', 'story', 'epic', 'subtask'] as const;

const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Operations',
  'Customer Success',
  'Data & Analytics',
  'Finance',
];

const POSITIONS = [
  'Software Engineer',
  'Senior Software Engineer',
  'Product Manager',
  'UI/UX Designer',
  'DevOps Engineer',
  'QA Engineer',
  'Data Analyst',
  'Engineering Manager',
  'Technical Support Specialist',
];

const TEAM_BLUEPRINTS = [
  { name: 'Platform Engineering', description: 'Backend services, API gateway, and infrastructure.' },
  { name: 'Product Engineering', description: 'Customer-facing web and mobile features.' },
  { name: 'Design & Research', description: 'Product design system and UX research.' },
  { name: 'Operations Excellence', description: 'Internal processes, support workflows, and reliability.' },
  { name: 'Data Intelligence', description: 'Analytics dashboards, insights, and reporting.' },
];

const PROJECT_BLUEPRINTS = [
  { key: 'NEX', name: 'NextWave Collaboration Suite' },
  { key: 'OPS', name: 'Operational Control Center' },
  { key: 'INS', name: 'Insight Pulse Dashboard' },
  { key: 'MOB', name: 'TeamConnect Mobile Companion' },
  { key: 'SEC', name: 'Secure Access Modernization' },
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function chance(probability: number): boolean {
  return Math.random() < probability;
}

function randomDateBetween(start: Date, end: Date): Date {
  return faker.date.between({ from: start, to: end });
}

function makeMeetingCode(): string {
  return faker.string.alphanumeric({ length: 9, casing: 'upper' });
}

function makeInviteToken(): string {
  return faker.string.alphanumeric(48);
}

function safeProjectKey(base: string, index: number): string {
  return `${base}${index}`.slice(0, 8);
}

async function clearDatabase() {
  const deleteOrder = [
    prisma.meetingReminder,
    prisma.issueLink,
    prisma.taskWatcher,
    prisma.taskAttachment,
    prisma.subtask,
    prisma.taskActivityLog,
    prisma.taskComment,
    prisma.timeEntry,
    prisma.task,
    prisma.workflowRun,
    prisma.workflow,
    prisma.notificationDigest,
    prisma.notificationPreference,
    prisma.notification,
    prisma.messageRead,
    prisma.messageReaction,
    prisma.thread,
    prisma.message,
    prisma.directMessage,
    prisma.channel,
    prisma.meetingParticipant,
    prisma.meetingRecording,
    prisma.meetingMinutes,
    prisma.meeting,
    prisma.documentPermission,
    prisma.documentVersion,
    prisma.document,
    prisma.documentFolder,
    prisma.drivePermission,
    prisma.driveFileVersion,
    prisma.driveEntry,
    prisma.reminderRecipient,
    prisma.reminder,
    prisma.workHours,
    prisma.taskTemplate,
    prisma.sprint,
    prisma.epic,
    prisma.project,
    prisma.component,
    prisma.version,
    prisma.wikiComment,
    prisma.wikiArticleVersion,
    prisma.wikiArticle,
    prisma.announcementRead,
    prisma.announcement,
    prisma.auditLog,
    prisma.refreshToken,
    prisma.invite,
    prisma.teamMember,
    prisma.team,
    prisma.rolePermission,
    prisma.taskWorkflowStatus,
    prisma.holiday,
    prisma.user,
    prisma.organization,
  ];

  for (const model of deleteOrder) {
    await (model as any).deleteMany();
  }
}

async function main() {
  console.log('🌱 Seeding realistic demo dataset...');
  await clearDatabase();

  const now = new Date();
  const ninetyDaysAgo = faker.date.recent({ days: 90, refDate: now });
  const inSixtyDays = faker.date.soon({ days: 60, refDate: now });

  const passwordHash = await bcrypt.hash('password123', 10);

  const organization = await prisma.organization.create({
    data: {
      name: 'Siam Digital Solutions Co., Ltd.',
      domain: 'siamdigital.co.th',
      allowedDomains: ['siamdigital.co.th', 'siamdigital.com'],
      settings: {
        timezone: 'Asia/Bangkok',
        workWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        meetingDefaults: {
        allowScreenShare: true,
          autoRecordForTownhalls: true,
        },
      },
      createdAt: faker.date.past({ years: 2, refDate: now }),
      updatedAt: now,
    },
  });

  const rolePermissionRows: Prisma.RolePermissionCreateManyInput[] = [];
  const resources = ['users', 'teams', 'meetings', 'tasks', 'channels', 'drive', 'settings', 'reports'];
  const actions = ['view', 'create', 'edit', 'delete', 'manage'];
  for (const role of ROLE_DISTRIBUTION) {
    for (const resource of resources) {
      for (const action of actions) {
        const allowed =
          role === 'org_owner'
            ? true
            : role === 'admin'
            ? action !== 'manage' || resource !== 'settings'
            : role === 'manager'
            ? ['view', 'create', 'edit'].includes(action)
            : action === 'view' || (action === 'create' && ['tasks', 'meetings', 'channels'].includes(resource));
        rolePermissionRows.push({
        organizationId: organization.id,
          role,
          resource,
          action,
          allowed,
          createdAt: faker.date.recent({ days: 60, refDate: now }),
          updatedAt: now,
        });
      }
    }
  }
  await prisma.rolePermission.createMany({ data: rolePermissionRows });

  const holidayRows: Prisma.HolidayCreateManyInput[] = [
    { name: 'วันปีใหม่', nameEn: 'New Year Day', date: new Date('2026-01-01'), type: 'public', country: 'TH', isRecurring: true, organizationId: organization.id },
    { name: 'วันสงกรานต์', nameEn: 'Songkran Festival', date: new Date('2026-04-13'), type: 'public', country: 'TH', isRecurring: true, organizationId: organization.id },
    { name: 'วันแรงงานแห่งชาติ', nameEn: 'Labour Day', date: new Date('2026-05-01'), type: 'public', country: 'TH', isRecurring: true, organizationId: organization.id },
  ];
  await prisma.holiday.createMany({ data: holidayRows });

  const users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    position: string;
  }> = [];

  const demoAccounts = [
    { name: 'ธีรภัทร์ วัฒนกุล', email: 'teerapat.w@siamdigital.co.th', role: 'org_owner', department: 'Engineering', position: 'Head of Engineering' },
    { name: 'Kanya Srisuk', email: 'kanya.s@siamdigital.co.th', role: 'admin', department: 'Operations', position: 'Operations Director' },
    { name: 'Phuwadon Jirakul', email: 'phuwadon.j@siamdigital.co.th', role: 'admin', department: 'Product', position: 'Product Director' },
    { name: 'Arisa Techawong', email: 'arisa.t@siamdigital.co.th', role: 'manager', department: 'Design', position: 'Design Manager' },
    { name: 'Nattapong P.', email: 'nattapong.p@siamdigital.co.th', role: 'manager', department: 'Engineering', position: 'Engineering Manager' },
    { name: 'Patchara L.', email: 'patchara.l@siamdigital.co.th', role: 'employee', department: 'Engineering', position: 'Senior Software Engineer' },
    { name: 'Thanakrit M.', email: 'thanakrit.m@siamdigital.co.th', role: 'employee', department: 'Data & Analytics', position: 'Data Analyst' },
    { name: 'Pimchanok R.', email: 'pimchanok.r@siamdigital.co.th', role: 'employee', department: 'Customer Success', position: 'Technical Support Specialist' },
  ] as const;

  for (const demo of demoAccounts) {
    const createdAt = randomDateBetween(new Date('2022-01-01'), new Date('2025-12-01'));
    const updatedAt = randomDateBetween(createdAt, now);

    const created = await prisma.user.create({
    data: {
        email: demo.email,
        name: demo.name,
        displayName: demo.name.split(' ')[0],
        password: passwordHash,
        role: demo.role,
        status: randomFrom([...USER_STATUS]),
        activity: randomFrom(['Available', 'In a meeting', 'Deep work', 'Reviewing pull requests', 'On break']),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(demo.name)}&background=random`,
        isActive: true,
        department: demo.department,
        position: demo.position,
      organizationId: organization.id,
        createdAt,
        updatedAt,
    },
  });

    users.push({
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      department: created.department ?? 'Engineering',
      position: created.position ?? 'Software Engineer',
    });
  }

  const userCount = 36;
  for (let i = demoAccounts.length; i < userCount; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    const email = faker.internet.email({ firstName, lastName, provider: 'siamdigital.co.th' }).toLowerCase();

    let role: (typeof ROLE_DISTRIBUTION)[number] = 'employee';
    if (i <= 10) role = 'manager';

    const createdAt = randomDateBetween(new Date('2022-01-01'), new Date('2025-12-01'));
    const updatedAt = randomDateBetween(createdAt, now);

    const created = await prisma.user.create({
      data: {
        email,
        name: fullName,
        displayName: chance(0.45) ? firstName : null,
        password: passwordHash,
        role,
        status: randomFrom([...USER_STATUS]),
        activity: randomFrom(['Available', 'In a meeting', 'Deep work', 'Reviewing pull requests', 'On break']),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`,
        isActive: chance(0.92),
        department: randomFrom(DEPARTMENTS),
        position: randomFrom(POSITIONS),
        organizationId: organization.id,
        createdAt,
        updatedAt,
      },
    });

    users.push({
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      department: created.department ?? 'Engineering',
      position: created.position ?? 'Software Engineer',
    });
  }

  const managers = users.filter((u) => u.role === 'manager' || u.role === 'admin' || u.role === 'org_owner');
  for (const user of users.filter((u) => u.role === 'employee')) {
    const manager = randomFrom(managers);
    if (manager.id !== user.id) {
      await prisma.user.update({ where: { id: user.id }, data: { managerId: manager.id } });
    }
  }

  const teams = [] as Array<{ id: string; name: string }>;
  for (const teamBlueprint of TEAM_BLUEPRINTS) {
    const createdAt = randomDateBetween(new Date('2023-01-01'), now);
    const team = await prisma.team.create({
      data: {
        name: teamBlueprint.name,
        description: teamBlueprint.description,
      organizationId: organization.id,
        createdAt,
        updatedAt: randomDateBetween(createdAt, now),
    },
  });
    teams.push({ id: team.id, name: team.name });
  }

  const teamMemberRows: Prisma.TeamMemberCreateManyInput[] = [];
  for (const team of teams) {
    const shuffled = faker.helpers.shuffle(users);
    const memberCount = faker.number.int({ min: 8, max: 16 });
    const members = shuffled.slice(0, memberCount);

    const manager = members.find((m) => ['org_owner', 'admin', 'manager'].includes(m.role)) ?? randomFrom(managers);
    teamMemberRows.push({
      teamId: team.id,
      userId: manager.id,
      role: 'admin',
      createdAt: faker.date.recent({ days: 120, refDate: now }),
    });

    for (const member of members) {
      if (member.id === manager.id) continue;
      teamMemberRows.push({
        teamId: team.id,
        userId: member.id,
        role: chance(0.18) ? 'lead' : 'member',
        createdAt: faker.date.recent({ days: 120, refDate: now }),
      });
    }
  }

  await prisma.teamMember.createMany({ data: teamMemberRows, skipDuplicates: true });

  const workflowStatuses = [
    { name: 'To Do', key: 'todo', color: '#64748b', category: 'todo', position: 1, teamId: null },
    { name: 'In Progress', key: 'in_progress', color: '#2563eb', category: 'doing', position: 2, teamId: null },
    { name: 'In Review', key: 'review', color: '#a855f7', category: 'doing', position: 3, teamId: null },
    { name: 'Done', key: 'done', color: '#16a34a', category: 'done', position: 4, teamId: null },
  ];
  await prisma.taskWorkflowStatus.createMany({ data: workflowStatuses });

  const projects: Array<{ id: string; teamId: string; key: string; name: string }> = [];
  const components: Array<{ id: string; teamId: string }> = [];
  const versions: Array<{ id: string; teamId: string }> = [];

  teams.forEach(() => undefined);
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    const p = PROJECT_BLUEPRINTS[i % PROJECT_BLUEPRINTS.length];
    const project = await prisma.project.create({
      data: {
        teamId: team.id,
        key: safeProjectKey(p.key, i + 1),
        name: `${p.name} - ${team.name}`,
        description: faker.company.buzzPhrase(),
        color: faker.color.rgb({ casing: 'upper', prefix: '#' }),
        createdAt: faker.date.recent({ days: 120, refDate: now }),
        updatedAt: now,
      },
    });
    projects.push({ id: project.id, teamId: team.id, key: project.key, name: project.name });

    const component = await prisma.component.create({
      data: {
        teamId: team.id,
        name: randomFrom(['API Gateway', 'Web Client', 'Mobile App', 'Notification Service', 'Data Pipeline']) + ` ${i + 1}`,
        description: faker.commerce.productDescription(),
      },
    });
    components.push({ id: component.id, teamId: team.id });

    const version = await prisma.version.create({
      data: {
        teamId: team.id,
        name: `v${faker.number.int({ min: 1, max: 3 })}.${faker.number.int({ min: 0, max: 9 })}.${faker.number.int({ min: 0, max: 12 })}`,
        description: faker.hacker.phrase(),
        released: chance(0.65),
        releaseDate: chance(0.75) ? faker.date.recent({ days: 120, refDate: now }) : faker.date.soon({ days: 45, refDate: now }),
      },
    });
    versions.push({ id: version.id, teamId: team.id });
  }

  const sprints: Array<{ id: string; teamId: string; status: string }> = [];
  const epics: Array<{ id: string; teamId: string }> = [];

  for (const team of teams) {
    const creator = randomFrom(managers);
    for (let i = 0; i < 2; i++) {
      const startDate = faker.date.recent({ days: 90, refDate: now });
      const endDate = faker.date.soon({ days: 20, refDate: startDate });
      const sprint = await prisma.sprint.create({
      data: {
          name: `${team.name.split(' ')[0]} Sprint ${i + 1}`,
          description: `Sprint focused on ${faker.hacker.noun()} and ${faker.hacker.verb()}`,
          startDate,
          endDate,
          goal: faker.company.catchPhrase(),
          status: randomFrom(['planned', 'active', 'closed']),
          teamId: team.id,
          createdById: creator.id,
          createdAt: faker.date.recent({ days: 120, refDate: now }),
          updatedAt: now,
        },
      });
      sprints.push({ id: sprint.id, teamId: team.id, status: sprint.status });
    }

    const epic = await prisma.epic.create({
      data: {
        name: faker.commerce.productName(),
        description: faker.company.catchPhraseDescriptor(),
        color: faker.color.rgb({ casing: 'upper', prefix: '#' }),
        status: randomFrom(['active', 'completed', 'cancelled']),
        teamId: team.id,
        createdById: creator.id,
      },
    });
    epics.push({ id: epic.id, teamId: team.id });
  }

  const meetings: Array<{ id: string; teamId: string | null; hostId: string; startTime: Date; endTime: Date | null; status: string }> = [];
  for (let i = 0; i < 38; i++) {
    const team = chance(0.8) ? randomFrom(teams) : null;
    const hostPool = users.filter((u) => !team || teamMemberRows.some((tm) => tm.teamId === team.id && tm.userId === u.id));
    const host = randomFrom(hostPool.length ? hostPool : users);

    const startTime = chance(0.65)
      ? faker.date.recent({ days: 45, refDate: now })
      : faker.date.soon({ days: 30, refDate: now });
    const durationMinutes = faker.number.int({ min: 20, max: 90 });
    const endTime = chance(0.9) ? new Date(startTime.getTime() + durationMinutes * 60_000) : null;

    const status = startTime < now ? (chance(0.15) ? 'live' : 'ended') : 'scheduled';
    const actualStartTime = status === 'ended' || status === 'live' ? new Date(startTime.getTime() + faker.number.int({ min: 0, max: 7 }) * 60_000) : null;
    const actualEndTime = status === 'ended' && endTime ? new Date(endTime.getTime() + faker.number.int({ min: -5, max: 12 }) * 60_000) : null;

    const meeting = await prisma.meeting.create({
      data: {
        title: randomFrom([
          'Weekly Product Sync',
          'Engineering Standup',
          'Quarterly Planning Review',
          'Client Progress Update',
          'Incident Postmortem',
          'Sprint Demo',
          'Architecture Decision Forum',
        ]),
        description: faker.company.catchPhrase(),
        startTime,
        endTime,
        meetingCode: makeMeetingCode(),
        isInstant: chance(0.08),
        allowScreenShare: chance(0.9),
        status,
        actualStartTime,
        actualEndTime,
        isRecurring: chance(0.25),
        recurringPattern: chance(0.25) ? randomFrom(['daily', 'weekly', 'monthly']) : null,
        recurringDays: chance(0.25) ? faker.helpers.arrayElements([1, 2, 3, 4, 5], faker.number.int({ min: 1, max: 3 })) : [],
        recurringEndDate: chance(0.25) ? faker.date.soon({ days: 120, refDate: now }) : null,
        hostId: host.id,
        teamId: team?.id ?? null,
        createdAt: randomDateBetween(ninetyDaysAgo, now),
        updatedAt: now,
      },
    });

    meetings.push({ id: meeting.id, teamId: meeting.teamId, hostId: meeting.hostId, startTime: meeting.startTime, endTime: meeting.endTime, status: meeting.status });
  }

  const channels: Array<{ id: string; teamId: string; name: string }> = [];
  for (const team of teams) {
    for (const channelName of ['general', 'announcements', 'engineering', 'random']) {
      const channel = await prisma.channel.create({
      data: {
          teamId: team.id,
          name: channelName,
          type: channelName === 'announcements' ? 'announcement' : channelName === 'engineering' ? 'voice' : 'general',
          description: `${team.name} ${channelName} channel`,
          createdAt: faker.date.recent({ days: 120, refDate: now }),
          updatedAt: now,
        },
      });
      channels.push({ id: channel.id, teamId: channel.teamId, name: channel.name });
    }
  }

  const invites: Prisma.InviteCreateManyInput[] = [];
  for (let i = 0; i < 10; i++) {
    const inviter = randomFrom(users.filter((u) => ['org_owner', 'admin', 'manager'].includes(u.role)));
    const team = chance(0.8) ? randomFrom(teams) : null;
    const createdAt = faker.date.recent({ days: 40, refDate: now });
    const expiresAt = chance(0.75) ? faker.date.soon({ days: 14, refDate: createdAt }) : faker.date.recent({ days: 10, refDate: now });

    invites.push({
      email: faker.internet.email().toLowerCase(),
      token: makeInviteToken(),
      role: randomFrom(['employee', 'manager']),
      teamId: team?.id,
      teamRole: chance(0.4) ? randomFrom(['member', 'lead']) : null,
      invitedBy: inviter.id,
      organizationId: organization.id,
      expiresAt,
      usedAt: chance(0.35) ? faker.date.between({ from: createdAt, to: expiresAt > now ? now : expiresAt }) : null,
      createdAt,
    });
  }
  await prisma.invite.createMany({ data: invites });

  const tasks: Array<{ id: string; teamId: string | null; assigneeId: string | null; reporterId: string | null; status: string; createdAt: Date }> = [];
  const taskCount = 140;
  for (let i = 0; i < taskCount; i++) {
    const team = chance(0.9) ? randomFrom(teams) : null;
    const teamMembersForTask = team
      ? users.filter((u) => teamMemberRows.some((tm) => tm.teamId === team.id && tm.userId === u.id))
      : users;

    const assignee = chance(0.92) ? randomFrom(teamMembersForTask) : null;
    const reporter = randomFrom(teamMembersForTask);
    const sprint = team ? randomFrom(sprints.filter((s) => s.teamId === team.id)) : null;
    const epic = team ? randomFrom(epics.filter((e) => e.teamId === team.id)) : null;
    const project = team ? randomFrom(projects.filter((p) => p.teamId === team.id)) : null;
    const component = team ? randomFrom(components.filter((c) => c.teamId === team.id)) : null;
    const version = team ? randomFrom(versions.filter((v) => v.teamId === team.id)) : null;
    const linkedMeeting = chance(0.2) ? randomFrom(meetings.filter((m) => !team || m.teamId === team.id || m.teamId === null)) : null;

    const createdAt = faker.date.recent({ days: 120, refDate: now });
    const status = randomFrom([...TASK_STATUS]);
    const dueDate = chance(0.8)
      ? faker.date.between({ from: new Date(createdAt.getTime() + 86_400_000), to: inSixtyDays })
      : null;

    const task = await prisma.task.create({
      data: {
        title: faker.helpers.arrayElement([
          'Improve onboarding completion rate',
          'Fix intermittent websocket disconnect',
          'Implement role-based dashboard widgets',
          'Refactor notification queue handling',
          'Add export to CSV in analytics',
          'Stabilize meeting recording pipeline',
          'Design handoff for project timeline module',
        ]),
        description: faker.lorem.paragraphs({ min: 1, max: 2 }),
        priority: randomFrom([...TASK_PRIORITY]),
        status,
        issueType: randomFrom([...ISSUE_TYPES]),
        resolution: status === 'done' ? randomFrom(['done', 'wont_fix', 'duplicate', 'cancelled']) : null,
        dueDate,
        tags: faker.helpers.arrayElements(['backend', 'frontend', 'api', 'ux', 'security', 'infra', 'reporting', 'integration'], faker.number.int({ min: 1, max: 3 })),
        storyPoints: chance(0.85) ? randomFrom([1, 2, 3, 5, 8, 13]) : null,
        estimate: chance(0.75) ? faker.number.float({ min: 2, max: 40, fractionDigits: 1 }) : null,
        isRecurring: chance(0.12),
        recurringPattern: chance(0.12) ? randomFrom(['daily', 'weekly', 'monthly']) : null,
        recurringInterval: chance(0.12) ? faker.number.int({ min: 1, max: 4 }) : 1,
        recurringEndDate: chance(0.12) ? faker.date.soon({ days: 180, refDate: now }) : null,
        templateId: null,
        position: faker.number.int({ min: 0, max: 200 }),
        createdAt,
        updatedAt: randomDateBetween(createdAt, now),
        assigneeId: assignee?.id ?? null,
        reporterId: reporter.id,
        teamId: team?.id ?? null,
        meetingId: linkedMeeting?.id ?? null,
        sprintId: sprint?.id ?? null,
        epicId: epic?.id ?? null,
        projectId: project?.id ?? null,
        componentId: component?.id ?? null,
        versionId: version?.id ?? null,
      },
    });

    tasks.push({
      id: task.id,
      teamId: task.teamId,
      assigneeId: task.assigneeId,
      reporterId: task.reporterId,
      status: task.status,
      createdAt: task.createdAt,
    });
  }

  for (const child of faker.helpers.shuffle(tasks).slice(0, 24)) {
    const parentCandidates = tasks.filter((t) => t.id !== child.id && t.teamId === child.teamId);
    if (parentCandidates.length) {
      await prisma.task.update({ where: { id: child.id }, data: { parentTaskId: randomFrom(parentCandidates).id } });
    }
  }

  const taskTemplates: Prisma.TaskTemplateCreateManyInput[] = [];
  for (const team of teams) {
    const creator = randomFrom(managers);
    taskTemplates.push({
      name: `${team.name} Bug Triage Template`,
      description: 'Standard template for high-priority production issues.',
      title: 'Production incident: ',
      content: 'Impact summary, reproduction steps, and mitigation plan.',
        priority: 'high',
      issueType: 'bug',
      tags: ['incident', 'production'],
      storyPoints: 5,
      estimate: 8,
      teamId: team.id,
      createdById: creator.id,
      projectId: projects.find((p) => p.teamId === team.id)?.id,
      componentId: components.find((c) => c.teamId === team.id)?.id,
      versionId: versions.find((v) => v.teamId === team.id)?.id,
      createdAt: faker.date.recent({ days: 90, refDate: now }),
      updatedAt: now,
    });
  }
  await prisma.taskTemplate.createMany({ data: taskTemplates });

  const taskComments: Prisma.TaskCommentCreateManyInput[] = [];
  const taskActivities: Prisma.TaskActivityLogCreateManyInput[] = [];
  const subtasks: Prisma.SubtaskCreateManyInput[] = [];
  const taskAttachments: Prisma.TaskAttachmentCreateManyInput[] = [];
  const taskWatchers: Prisma.TaskWatcherCreateManyInput[] = [];

  for (const task of tasks.slice(0, 100)) {
    const participants = users.filter((u) => !task.teamId || teamMemberRows.some((tm) => tm.teamId === task.teamId && tm.userId === u.id));

    const commentCount = faker.number.int({ min: 0, max: 4 });
    for (let i = 0; i < commentCount; i++) {
      const commenter = randomFrom(participants);
      taskComments.push({
        taskId: task.id,
        userId: commenter.id,
        text: faker.helpers.arrayElement([
          'อัปเดตล่าสุด: ส่วน API ผ่านการทดสอบแล้ว เหลือ integration test',
          'Blocked by external dependency, waiting for vendor response.',
          'Please verify acceptance criteria with product owner.',
          'จัดการ edge case เรื่อง timezone เรียบร้อยแล้ว',
        ]),
        createdAt: faker.date.between({ from: task.createdAt, to: now }),
        updatedAt: now,
      });
    }

    taskActivities.push({
      taskId: task.id,
      userId: task.reporterId,
      action: 'created',
      oldValue: null,
      newValue: task.status,
      createdAt: task.createdAt,
    });

    if (task.assigneeId) {
      taskActivities.push({
        taskId: task.id,
        userId: task.reporterId,
        action: 'assigned',
        oldValue: null,
        newValue: task.assigneeId,
        createdAt: faker.date.between({ from: task.createdAt, to: now }),
      });
    }

    if (chance(0.5)) {
      const oldStatus = randomFrom(['todo', 'in_progress', 'review']);
      taskActivities.push({
        taskId: task.id,
        userId: task.assigneeId ?? task.reporterId,
        action: 'status_changed',
        oldValue: oldStatus,
        newValue: task.status,
        createdAt: faker.date.between({ from: task.createdAt, to: now }),
      });
    }

    const subtaskCount = faker.number.int({ min: 0, max: 3 });
    for (let i = 0; i < subtaskCount; i++) {
      subtasks.push({
        taskId: task.id,
        title: faker.helpers.arrayElement(['Review API contract', 'Prepare QA checklist', 'Update release notes', 'Refine acceptance criteria']),
        isCompleted: chance(0.6),
        position: i + 1,
        createdAt: faker.date.between({ from: task.createdAt, to: now }),
        updatedAt: now,
      });
    }

    if (chance(0.4)) {
      const uploader = randomFrom(participants);
      taskAttachments.push({
        taskId: task.id,
        userId: uploader.id,
        name: `${faker.system.fileName({ extensionCount: 1 })}`,
        url: `https://files.siamdigital.co.th/tasks/${task.id}/${faker.string.uuid()}.pdf`,
        mimeType: 'application/pdf',
        size: faker.number.int({ min: 24_000, max: 2_600_000 }),
        createdAt: faker.date.between({ from: task.createdAt, to: now }),
      });
    }

    const watcherCandidates = faker.helpers.shuffle(participants).slice(0, faker.number.int({ min: 0, max: 3 }));
    for (const watcher of watcherCandidates) {
      if (watcher.id === task.assigneeId) continue;
      taskWatchers.push({
        taskId: task.id,
        userId: watcher.id,
        createdAt: faker.date.between({ from: task.createdAt, to: now }),
      });
    }
  }

  await prisma.taskComment.createMany({ data: taskComments });
  await prisma.taskActivityLog.createMany({ data: taskActivities });
  await prisma.subtask.createMany({ data: subtasks });
  await prisma.taskAttachment.createMany({ data: taskAttachments });
  await prisma.taskWatcher.createMany({ data: taskWatchers, skipDuplicates: true });

  const issueLinks: Prisma.IssueLinkCreateManyInput[] = [];
  const linkedTaskPairs = faker.helpers.shuffle(tasks).slice(0, 28);
  for (let i = 0; i < linkedTaskPairs.length - 1; i += 2) {
    const source = linkedTaskPairs[i];
    const target = linkedTaskPairs[i + 1];
    if (source.id === target.id) continue;
    issueLinks.push({
      sourceId: source.id,
      targetId: target.id,
      type: randomFrom(['blocks', 'relates', 'duplicates', 'clones']),
      createdAt: faker.date.recent({ days: 45, refDate: now }),
    });
  }
  await prisma.issueLink.createMany({ data: issueLinks, skipDuplicates: true });

  const messages: Array<{ id: string; channelId: string; senderId: string; createdAt: Date }> = [];
  for (const channel of channels) {
    const teamUsers = users.filter((u) => teamMemberRows.some((tm) => tm.teamId === channel.teamId && tm.userId === u.id));
    const messageCount = faker.number.int({ min: 14, max: 28 });

    for (let i = 0; i < messageCount; i++) {
      const sender = randomFrom(teamUsers);
      const text = randomFrom([
        'ขออัปเดตสถานะงานใน sprint ปัจจุบันหน่อยครับ',
        'Client approved the revised delivery timeline.',
        'Please review the API contract changes before EOD.',
        'เรา deploy hotfix รอบ 19:30 แล้ว system stable ครับ',
        'Reminder: team retro starts in 20 minutes.',
        'Need support from infra on queue throughput spike.',
      ]);

      const createdAt = faker.date.recent({ days: 20, refDate: now });
      const message = await prisma.message.create({
      data: {
          channelId: channel.id,
          senderId: sender.id,
          text,
          isPinned: chance(0.07),
          isSystem: chance(0.05),
          attachments: chance(0.16)
            ? [{
                url: `https://files.siamdigital.co.th/messages/${faker.string.uuid()}.png`,
                name: faker.system.fileName({ extensionCount: 1 }),
                type: 'image/png',
              }]
            : undefined,
          mentions: chance(0.25) ? [randomFrom(teamUsers).id] : [],
          createdAt,
          updatedAt: randomDateBetween(createdAt, now),
        },
      });

      messages.push({ id: message.id, channelId: message.channelId, senderId: message.senderId, createdAt });
    }
  }

  const threadRoots = faker.helpers.shuffle(messages).slice(0, 18);
  for (const root of threadRoots) {
    const thread = await prisma.thread.create({ data: { messageId: root.id, channelId: root.channelId, createdAt: root.createdAt, updatedAt: now } });
    const channel = channels.find((c) => c.id === root.channelId)!;
    const teamUsers = users.filter((u) => teamMemberRows.some((tm) => tm.teamId === channel.teamId && tm.userId === u.id));

    for (let i = 0; i < faker.number.int({ min: 1, max: 4 }); i++) {
      const sender = randomFrom(teamUsers);
      await prisma.message.create({
      data: {
          channelId: root.channelId,
          senderId: sender.id,
          text: randomFrom(['Thanks for sharing this.', 'เห็นด้วยครับ เดี๋ยวผมจัดการต่อ', 'Can we prioritize this for next sprint?', 'I have pushed a patch to staging.']),
          threadId: thread.id,
          replyToId: chance(0.4) ? root.id : null,
          mentions: chance(0.2) ? [root.senderId] : [],
          createdAt: faker.date.between({ from: root.createdAt, to: now }),
          updatedAt: now,
        },
      });
    }
  }

  const messageReadRows: Prisma.MessageReadCreateManyInput[] = [];
  const messageReactionRows: Prisma.MessageReactionCreateManyInput[] = [];
  for (const msg of messages.slice(0, 220)) {
    const channel = channels.find((c) => c.id === msg.channelId)!;
    const teamUsers = users.filter((u) => teamMemberRows.some((tm) => tm.teamId === channel.teamId && tm.userId === u.id));
    const readers = faker.helpers.shuffle(teamUsers).slice(0, faker.number.int({ min: 2, max: Math.min(8, teamUsers.length) }));

    for (const reader of readers) {
      messageReadRows.push({
        messageId: msg.id,
        userId: reader.id,
        readAt: faker.date.between({ from: msg.createdAt, to: now }),
      });

      if (chance(0.2)) {
        messageReactionRows.push({
          messageId: msg.id,
          userId: reader.id,
          emoji: randomFrom(['👍', '❤️', '🎉', '👀', '✅']),
          createdAt: faker.date.between({ from: msg.createdAt, to: now }),
        });
      }
    }
  }
  await prisma.messageRead.createMany({ data: messageReadRows, skipDuplicates: true });
  await prisma.messageReaction.createMany({ data: messageReactionRows, skipDuplicates: true });

  const directMessagePairs = faker.helpers.shuffle(users).slice(0, 24);
  for (let i = 0; i < directMessagePairs.length - 1; i += 2) {
    const sender = directMessagePairs[i];
    const receiver = directMessagePairs[i + 1];
    for (let m = 0; m < faker.number.int({ min: 3, max: 8 }); m++) {
      const createdAt = faker.date.recent({ days: 30, refDate: now });
      await prisma.directMessage.create({
    data: {
          senderId: sender.id,
          receiverId: receiver.id,
          text: randomFrom([
            'Can you review the proposal before 4 PM?',
            'รับทราบครับ เดี๋ยวส่งอัปเดตให้ภายในวันนี้',
            'Please share the latest deck for tomorrow\'s client meeting.',
            'I have updated the estimates in the sprint board.',
          ]),
          isPinned: chance(0.06),
          isSystem: false,
          attachments: chance(0.1)
            ? [{
                url: `https://files.siamdigital.co.th/dm/${faker.string.uuid()}.pdf`,
                name: faker.system.fileName({ extensionCount: 1 }),
                type: 'application/pdf',
              }]
            : undefined,
          mentions: [],
          createdAt,
          updatedAt: randomDateBetween(createdAt, now),
        },
      });
    }
  }

  const notifications: Array<{ id: string; userId: string; type: string; createdAt: Date }> = [];
  for (const user of users) {
    const notifCount = faker.number.int({ min: 4, max: 14 });
    for (let i = 0; i < notifCount; i++) {
      const type = randomFrom(['task_assigned', 'meeting_created', 'meeting_starting', 'message_mention', 'announcement', 'task_updated']);
      const createdAt = faker.date.recent({ days: 25, refDate: now });
      const notification = await prisma.notification.create({
    data: {
          userId: user.id,
          type,
          title: randomFrom([
            'Task assigned to you',
            'Meeting starts in 15 minutes',
            'You were mentioned in #general',
            'New company announcement',
            'Task status changed',
          ]),
          message: randomFrom([
            'Please check the sprint board for updated priorities.',
            'A meeting relevant to your team is about to begin.',
            'Someone requested your review on an active task.',
            'Organization update posted by leadership.',
          ]),
          link: chance(0.75) ? `/dashboard/${faker.string.uuid()}` : null,
          read: chance(0.58),
          priority: randomFrom(['urgent', 'high', 'normal', 'low']),
          groupedId: chance(0.22) ? faker.string.uuid() : null,
          relatedId: chance(0.45) ? randomFrom(tasks).id : null,
          relatedType: chance(0.45) ? 'task' : null,
          createdAt,
          updatedAt: randomDateBetween(createdAt, now),
        },
      });
      notifications.push({ id: notification.id, userId: user.id, type, createdAt });
    }
  }

  await prisma.notificationPreference.createMany({
    data: users.map((u) => ({
      userId: u.id,
      mentionDelivery: 'realtime',
      taskAssignedDelivery: chance(0.8) ? 'realtime' : 'digest_hourly',
      meetingStartingDelivery: 'realtime',
      pullRequestReviewDelivery: chance(0.6) ? 'digest_hourly' : 'realtime',
      taskUpdateDelivery: chance(0.3) ? 'realtime' : 'digest_hourly',
      meetingCreatedDelivery: 'digest_hourly',
      messageDelivery: chance(0.6) ? 'digest_hourly' : 'digest_daily',
      announcementDelivery: 'digest_daily',
      teamUpdateDelivery: randomFrom(['digest_daily', 'digest_weekly']),
      digestTime: randomFrom(['08:30', '12:00', '18:00']),
      digestTimezone: 'Asia/Bangkok',
      digestIncludeRead: chance(0.3),
      soundEnabled: chance(0.7),
      desktopEnabled: chance(0.8),
      badgeEnabled: chance(0.9),
      createdAt: faker.date.recent({ days: 120, refDate: now }),
      updatedAt: now,
    })),
  });

  for (const user of users) {
    const userNotifications = notifications.filter((n) => n.userId === user.id);
    if (!userNotifications.length) continue;

    const periodEnd = now;
    const periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const byType: Record<string, number> = {};
    userNotifications.forEach((n) => {
      byType[n.type] = (byType[n.type] ?? 0) + 1;
    });

  await prisma.notificationDigest.create({
    data: {
        userId: user.id,
      digestType: 'daily',
        periodStart,
        periodEnd,
        totalCount: userNotifications.length,
        unreadCount: userNotifications.filter((n) => n.createdAt > periodStart).length,
        byType,
        highlights: userNotifications.slice(0, 3).map((n) => ({ id: n.id, type: n.type })),
        notificationIds: userNotifications.slice(0, 8).map((n) => n.id),
        sentAt: faker.date.recent({ days: 1, refDate: now }),
        readAt: chance(0.4) ? faker.date.recent({ days: 1, refDate: now }) : null,
        isRead: chance(0.5),
        createdAt: faker.date.recent({ days: 2, refDate: now }),
        updatedAt: now,
      },
    });
  }

  const meetingParticipants: Prisma.MeetingParticipantCreateManyInput[] = [];
  const meetingReminders: Prisma.MeetingReminderCreateManyInput[] = [];
  const meetingMinutesRows: Prisma.MeetingMinutesCreateManyInput[] = [];

  for (const meeting of meetings) {
    const candidates = users.filter((u) => !meeting.teamId || teamMemberRows.some((tm) => tm.teamId === meeting.teamId && tm.userId === u.id));
    const participants = faker.helpers.shuffle(candidates).slice(0, faker.number.int({ min: 3, max: Math.min(10, candidates.length) }));

    for (const participant of participants) {
      const joinedAt = new Date(meeting.startTime.getTime() + faker.number.int({ min: 0, max: 6 }) * 60_000);
      const leftAt = meeting.endTime ? new Date(meeting.endTime.getTime() - faker.number.int({ min: 0, max: 5 }) * 60_000) : null;
      const duration = leftAt ? Math.max(60, Math.floor((leftAt.getTime() - joinedAt.getTime()) / 1000)) : null;

      meetingParticipants.push({
        meetingId: meeting.id,
        userId: participant.id,
        joinedAt,
        leftAt,
        duration,
        role: participant.id === meeting.hostId ? 'host' : chance(0.08) ? 'co-host' : 'participant',
        handRaised: chance(0.18),
        isMuted: chance(0.54),
        isVideoOn: chance(0.72),
        isSharing: participant.id === meeting.hostId ? chance(0.6) : chance(0.2),
      });

      if (meeting.status !== 'ended' && chance(0.35)) {
        meetingReminders.push({
          meetingId: meeting.id,
          userId: participant.id,
          minutesBefore: randomFrom([5, 15, 30]),
          sentAt: faker.date.between({ from: new Date(meeting.startTime.getTime() - 40 * 60_000), to: meeting.startTime }),
        });
      }
    }

    if (meeting.status === 'ended' && chance(0.65)) {
      meetingMinutesRows.push({
        meetingId: meeting.id,
        title: `${randomFrom(['Weekly Sync', 'Sprint Demo', 'Client Review'])} - Minutes`,
        content: `## Summary\n${faker.lorem.paragraph()}\n\n## Next Steps\n- ${faker.company.buzzPhrase()}\n- ${faker.company.catchPhrase()}`,
        actionItems: [
          { owner: randomFrom(users).name, task: 'Prepare follow-up plan', dueDate: faker.date.soon({ days: 7, refDate: now }) },
          { owner: randomFrom(users).name, task: 'Share meeting recap with stakeholders', dueDate: faker.date.soon({ days: 3, refDate: now }) },
        ],
        decisions: [faker.company.catchPhrase(), faker.hacker.phrase()],
        attendees: participants.map((p) => p.id),
        createdBy: meeting.hostId,
        createdAt: faker.date.between({ from: meeting.startTime, to: now }),
        updatedAt: now,
      });
    }
  }

  await prisma.meetingParticipant.createMany({ data: meetingParticipants, skipDuplicates: true });
  await prisma.meetingReminder.createMany({ data: meetingReminders, skipDuplicates: true });
  await prisma.meetingMinutes.createMany({ data: meetingMinutesRows });

  const driveEntries: Array<{ id: string; teamId: string; isFolder: boolean }> = [];
  for (const team of teams) {
    const folderNames = ['Root', 'Engineering Docs', 'Meeting Recordings'];
    for (const folderName of folderNames) {
      const creator = randomFrom(users.filter((u) => teamMemberRows.some((tm) => tm.teamId === team.id && tm.userId === u.id)));
      const entry = await prisma.driveEntry.create({
    data: {
          teamId: team.id,
          createdById: creator.id,
          name: folderName,
          path: '/',
          isFolder: true,
          createdAt: faker.date.recent({ days: 90, refDate: now }),
          updatedAt: now,
        },
      });
      driveEntries.push({ id: entry.id, teamId: team.id, isFolder: true });
    }

    for (let i = 0; i < 6; i++) {
      const creator = randomFrom(users.filter((u) => teamMemberRows.some((tm) => tm.teamId === team.id && tm.userId === u.id)));
      const entry = await prisma.driveEntry.create({
    data: {
          teamId: team.id,
          createdById: creator.id,
          name: faker.system.fileName({ extensionCount: 1 }),
          path: '/Engineering Docs',
      isFolder: false,
          createdAt: faker.date.recent({ days: 90, refDate: now }),
          updatedAt: now,
        },
      });
      driveEntries.push({ id: entry.id, teamId: team.id, isFolder: false });
    }
  }

  const driveFileVersionRows: Prisma.DriveFileVersionCreateManyInput[] = [];
  const drivePermissionRows: Prisma.DrivePermissionCreateManyInput[] = [];

  for (const entry of driveEntries.filter((e) => !e.isFolder)) {
    const members = users.filter((u) => teamMemberRows.some((tm) => tm.teamId === entry.teamId && tm.userId === u.id));
    const creator = randomFrom(members);

    const versionCount = faker.number.int({ min: 1, max: 3 });
    for (let version = 1; version <= versionCount; version++) {
      driveFileVersionRows.push({
        entryId: entry.id,
        version,
        storageKey: `teams/${entry.teamId}/files/${entry.id}/v${version}.bin`,
        mimeType: randomFrom(['application/pdf', 'image/png', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
        size: faker.number.int({ min: 32_000, max: 5_000_000 }),
        createdById: creator.id,
        createdAt: faker.date.recent({ days: 60, refDate: now }),
      });
    }

    const permittedUsers = faker.helpers.shuffle(members).slice(0, faker.number.int({ min: 2, max: Math.min(7, members.length) }));
    for (const user of permittedUsers) {
      drivePermissionRows.push({
        entryId: entry.id,
        userId: user.id,
        permission: chance(0.35) ? 'edit' : 'view',
        createdAt: faker.date.recent({ days: 60, refDate: now }),
        updatedAt: now,
      });
    }
  }

  await prisma.driveFileVersion.createMany({ data: driveFileVersionRows });
  await prisma.drivePermission.createMany({ data: drivePermissionRows, skipDuplicates: true });

  for (const meeting of meetings.filter((m) => m.status === 'ended').slice(0, 18)) {
    const teamDriveFiles = driveEntries.filter((e) => !e.isFolder && e.teamId === (meeting.teamId ?? teams[0].id));
    const linkedEntry = teamDriveFiles.length ? randomFrom(teamDriveFiles) : null;
    await prisma.meetingRecording.create({
    data: {
        meetingId: meeting.id,
        fileUrl: `https://storage.siamdigital.co.th/recordings/${meeting.id}.mp4`,
        fileSize: faker.number.int({ min: 120_000_000, max: 980_000_000 }),
        duration: faker.number.int({ min: 900, max: 5400 }),
        status: randomFrom(['processing', 'completed', 'failed']),
        driveEntryId: linkedEntry?.id ?? null,
        createdBy: meeting.hostId,
        createdAt: faker.date.between({ from: meeting.startTime, to: now }),
        updatedAt: now,
      },
    });
  }

  const documentFolders: Array<{ id: string; teamId: string | null; creatorId: string }> = [];
  for (const team of teams) {
    const creator = randomFrom(users.filter((u) => teamMemberRows.some((tm) => tm.teamId === team.id && tm.userId === u.id)));
    const rootFolder = await prisma.documentFolder.create({
    data: {
        name: `${team.name} Docs`,
        description: `Shared documentation space for ${team.name}`,
        parentId: null,
        teamId: team.id,
        createdBy: creator.id,
        createdAt: faker.date.recent({ days: 90, refDate: now }),
        updatedAt: now,
      },
    });

    documentFolders.push({ id: rootFolder.id, teamId: team.id, creatorId: creator.id });

    const childFolder = await prisma.documentFolder.create({
    data: {
        name: 'Playbooks',
        description: 'Operational and process playbooks',
        parentId: rootFolder.id,
        teamId: team.id,
        createdBy: creator.id,
        createdAt: faker.date.recent({ days: 90, refDate: now }),
        updatedAt: now,
      },
    });
    documentFolders.push({ id: childFolder.id, teamId: team.id, creatorId: creator.id });
  }

  const documents: Array<{ id: string; teamId: string | null; createdBy: string; createdAt: Date }> = [];
  for (const folder of documentFolders) {
    const memberPool = users.filter((u) => !folder.teamId || teamMemberRows.some((tm) => tm.teamId === folder.teamId && tm.userId === u.id));
    const docCount = faker.number.int({ min: 2, max: 4 });

    for (let i = 0; i < docCount; i++) {
      const creator = randomFrom(memberPool);
      const createdAt = faker.date.recent({ days: 120, refDate: now });
      const document = await prisma.document.create({
    data: {
          name: randomFrom([
            'Engineering On-call Playbook',
            'Q2 Product Roadmap',
            'SLA Escalation Matrix',
            'Incident Response Checklist',
            'Client Integration Guide',
          ]),
          description: faker.lorem.sentence(),
          fileUrl: `https://docs.siamdigital.co.th/${faker.string.uuid()}`,
          fileSize: faker.number.int({ min: 30_000, max: 4_500_000 }),
          mimeType: randomFrom(['application/pdf', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
          folderId: folder.id,
          teamId: folder.teamId,
          createdBy: creator.id,
          version: faker.number.int({ min: 1, max: 4 }),
          isArchived: chance(0.12),
          createdAt,
          updatedAt: randomDateBetween(createdAt, now),
        },
      });
      documents.push({ id: document.id, teamId: document.teamId, createdBy: document.createdBy, createdAt });
    }
  }

  const docVersionRows: Prisma.DocumentVersionCreateManyInput[] = [];
  const docPermissionRows: Prisma.DocumentPermissionCreateManyInput[] = [];

  for (const doc of documents) {
    const teamMembers = users.filter((u) => !doc.teamId || teamMemberRows.some((tm) => tm.teamId === doc.teamId && tm.userId === u.id));
    const versionCount = faker.number.int({ min: 1, max: 3 });

    for (let v = 1; v <= versionCount; v++) {
      const editor = randomFrom(teamMembers);
      docVersionRows.push({
        documentId: doc.id,
        version: v,
        fileUrl: `https://docs.siamdigital.co.th/${doc.id}/v${v}`,
        fileSize: faker.number.int({ min: 28_000, max: 4_800_000 }),
        mimeType: 'application/pdf',
        changeNote: randomFrom(['Initial upload', 'Updated KPI numbers', 'Added appendix section', 'Fixed typos']),
        createdBy: editor.id,
        createdAt: faker.date.between({ from: doc.createdAt, to: now }),
      });
    }

    const permitted = faker.helpers.shuffle(teamMembers).slice(0, faker.number.int({ min: 2, max: Math.min(8, teamMembers.length) }));
    for (const user of permitted) {
      docPermissionRows.push({
        documentId: doc.id,
        userId: user.id,
        permission: randomFrom(['view', 'edit', 'delete']),
        createdAt: faker.date.recent({ days: 80, refDate: now }),
        updatedAt: now,
      });
    }
  }

  await prisma.documentVersion.createMany({ data: docVersionRows, skipDuplicates: true });
  await prisma.documentPermission.createMany({ data: docPermissionRows, skipDuplicates: true });

  const workHourRows: Prisma.WorkHoursCreateManyInput[] = [];
  for (const user of users) {
    const associatedTeams = teams.filter((t) => teamMemberRows.some((tm) => tm.teamId === t.id && tm.userId === user.id));
    const teamId = associatedTeams.length ? randomFrom(associatedTeams).id : null;

    for (let d = 1; d <= 12; d++) {
      const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      if (isWeekend && chance(0.75)) continue;

      workHourRows.push({
        userId: user.id,
        teamId,
        date,
        hours: isWeekend ? faker.number.float({ min: 1, max: 4, fractionDigits: 1 }) : faker.number.float({ min: 6, max: 9.5, fractionDigits: 1 }),
        notes: isWeekend ? 'On-call support and urgent fix' : randomFrom(['Feature implementation and code review', 'Client support and sprint planning', 'Bug triage and QA collaboration']),
        createdAt: faker.date.between({ from: new Date(date.getTime() - 3 * 60 * 60 * 1000), to: date }),
        updatedAt: now,
      });
    }
  }
  await prisma.workHours.createMany({ data: workHourRows, skipDuplicates: true });

  const timeEntries: Prisma.TimeEntryCreateManyInput[] = [];
  for (const user of users) {
    const userTasks = tasks.filter((t) => t.assigneeId === user.id);
    const entryCount = faker.number.int({ min: 6, max: 18 });

    for (let i = 0; i < entryCount; i++) {
      const task = userTasks.length ? randomFrom(userTasks) : randomFrom(tasks);
      const start = faker.date.recent({ days: 35, refDate: now });
      const durationMinutes = faker.number.int({ min: 30, max: 240 });
      const hasEnded = chance(0.88);
      const end = hasEnded ? new Date(start.getTime() + durationMinutes * 60_000) : null;

      timeEntries.push({
        userId: user.id,
        taskId: chance(0.8) ? task.id : null,
        meetingId: chance(0.25) ? randomFrom(meetings).id : null,
        description: randomFrom(['Implementing feature requirements', 'Investigating production issue', 'Writing automated tests', 'Preparing sprint review artifacts']),
        startTime: start,
        endTime: end,
        duration: end ? durationMinutes * 60 : null,
        billable: chance(0.55),
        tags: faker.helpers.arrayElements(['development', 'meeting', 'support', 'research', 'review'], faker.number.int({ min: 1, max: 3 })),
        createdAt: start,
        updatedAt: end ? end : now,
      });
    }
  }
  await prisma.timeEntry.createMany({ data: timeEntries });

  const reminderRows: Array<{ id: string; createdBy: string }> = [];
  for (let i = 0; i < 40; i++) {
    const creator = randomFrom(users);
    const remindAt = chance(0.65) ? faker.date.soon({ days: 30, refDate: now }) : faker.date.recent({ days: 20, refDate: now });
    const relatedTask = chance(0.55) ? randomFrom(tasks) : null;
    const reminder = await prisma.reminder.create({
      data: {
        title: randomFrom(['Follow up with client', 'Submit sprint estimate', 'Prepare release checklist', 'Review architecture proposal']),
        description: faker.lorem.sentence(),
        type: relatedTask ? 'task' : randomFrom(['meeting', 'custom']),
        relatedId: relatedTask?.id ?? null,
        relatedType: relatedTask ? 'task' : null,
        remindAt,
        isSent: remindAt < now,
        createdBy: creator.id,
        createdAt: faker.date.recent({ days: 45, refDate: now }),
        updatedAt: now,
      },
    });
    reminderRows.push({ id: reminder.id, createdBy: creator.id });
  }

  const reminderRecipientRows: Prisma.ReminderRecipientCreateManyInput[] = [];
  for (const reminder of reminderRows) {
    const recipients = faker.helpers.shuffle(users).slice(0, faker.number.int({ min: 1, max: 4 }));
    for (const recipient of recipients) {
      const read = chance(0.5);
      reminderRecipientRows.push({
        reminderId: reminder.id,
        userId: recipient.id,
        isRead: read,
        readAt: read ? faker.date.recent({ days: 10, refDate: now }) : null,
        createdAt: faker.date.recent({ days: 20, refDate: now }),
      });
    }
  }
  await prisma.reminderRecipient.createMany({ data: reminderRecipientRows, skipDuplicates: true });

  const workflows: Array<{ id: string }> = [];
  for (const team of teams) {
    const creator = randomFrom(users.filter((u) => teamMemberRows.some((tm) => tm.teamId === team.id && tm.userId === u.id)));
    for (const trigger of ['task_completed', 'meeting_ended', 'pr_created']) {
      const workflow = await prisma.workflow.create({
      data: {
          name: `${team.name} - ${trigger.replace('_', ' ')} automation`,
          description: faker.company.catchPhrase(),
          trigger,
          conditions: { teamId: team.id, trigger },
          actions: [
            { type: 'notify', channel: 'announcements' },
            { type: 'create_task', template: 'follow-up' },
          ],
          isActive: chance(0.78),
          teamId: team.id,
          createdBy: creator.id,
          createdAt: faker.date.recent({ days: 60, refDate: now }),
          updatedAt: now,
        },
      });
      workflows.push({ id: workflow.id });
    }
  }

  for (const workflow of workflows) {
    for (let i = 0; i < faker.number.int({ min: 2, max: 8 }); i++) {
      const startedAt = faker.date.recent({ days: 30, refDate: now });
      const completedAt = chance(0.85) ? faker.date.soon({ days: 1, refDate: startedAt }) : null;
      const status = completedAt ? randomFrom(['completed', 'failed']) : 'running';
      await prisma.workflowRun.create({
        data: {
          workflowId: workflow.id,
          userId: chance(0.8) ? randomFrom(users).id : null,
          status,
          input: { source: 'system_event', severity: randomFrom(['low', 'medium', 'high']) },
          output: status === 'completed' ? { createdTasks: faker.number.int({ min: 0, max: 3 }) } : undefined,
          error: status === 'failed' ? 'Condition evaluation timeout after retry limit' : null,
          startedAt,
          completedAt,
        },
      });
    }
  }

  const wikiArticles: Array<{ id: string; createdAt: Date }> = [];
  for (const team of teams) {
    const writers = users.filter((u) => teamMemberRows.some((tm) => tm.teamId === team.id && tm.userId === u.id));
    for (let i = 0; i < 4; i++) {
      const creator = randomFrom(writers);
      const createdAt = faker.date.recent({ days: 180, refDate: now });
      const article = await prisma.wikiArticle.create({
    data: {
          title: randomFrom([
            'Incident Management Playbook',
            'Service Ownership Matrix',
            'Release Readiness Checklist',
            'Customer Escalation Guideline',
            'Engineering Onboarding Guide',
          ]),
          content: `# ${faker.company.catchPhrase()}\n\n${faker.lorem.paragraphs({ min: 2, max: 4 })}`,
          category: randomFrom(['Engineering', 'Operations', 'Product', 'Security', 'Support']),
          tags: faker.helpers.arrayElements(['onboarding', 'playbook', 'policy', 'qa', 'deployment', 'incident'], faker.number.int({ min: 2, max: 4 })),
          isPublic: chance(0.7),
          teamId: team.id,
          createdBy: creator.id,
          version: faker.number.int({ min: 1, max: 4 }),
          viewCount: faker.number.int({ min: 10, max: 900 }),
          createdAt,
          updatedAt: randomDateBetween(createdAt, now),
        },
      });
      wikiArticles.push({ id: article.id, createdAt });
    }
  }

  const wikiVersions: Prisma.WikiArticleVersionCreateManyInput[] = [];
  const wikiComments: Prisma.WikiCommentCreateManyInput[] = [];
  for (const article of wikiArticles) {
    const versionCount = faker.number.int({ min: 1, max: 3 });
    for (let version = 1; version <= versionCount; version++) {
      const creator = randomFrom(users);
      wikiVersions.push({
        articleId: article.id,
        version,
        title: `${faker.company.catchPhraseNoun()} v${version}`,
        content: faker.lorem.paragraphs({ min: 1, max: 3 }),
        changeNote: randomFrom(['Initial publication', 'Clarified steps', 'Updated examples', 'Added section for edge cases']),
        createdBy: creator.id,
        createdAt: faker.date.between({ from: article.createdAt, to: now }),
      });
    }

    for (let c = 0; c < faker.number.int({ min: 0, max: 4 }); c++) {
      wikiComments.push({
        articleId: article.id,
        createdBy: randomFrom(users).id,
        content: randomFrom([
          'Great write-up, this helped us reduce onboarding time.',
          'Can we add troubleshooting steps for SSO configuration?',
          'ข้อมูลครบถ้วนมากครับ ขออนุญาตแชร์กับทีม support',
          'Please include example payloads for easier implementation.',
        ]),
        createdAt: faker.date.recent({ days: 30, refDate: now }),
        updatedAt: now,
      });
    }
  }
  await prisma.wikiArticleVersion.createMany({ data: wikiVersions, skipDuplicates: true });
  await prisma.wikiComment.createMany({ data: wikiComments });

  const announcements: Array<{ id: string; createdAt: Date }> = [];
  for (let i = 0; i < 12; i++) {
    const creator = randomFrom(users.filter((u) => ['org_owner', 'admin', 'manager'].includes(u.role)));
    const targetType = randomFrom(['all', 'team', 'role', 'user']);
    const targetIds =
      targetType === 'team'
        ? faker.helpers.arrayElements(teams.map((t) => t.id), faker.number.int({ min: 1, max: 3 }))
        : targetType === 'role'
        ? faker.helpers.arrayElements(['admin', 'manager', 'employee'], faker.number.int({ min: 1, max: 2 }))
        : targetType === 'user'
        ? faker.helpers.arrayElements(users.map((u) => u.id), faker.number.int({ min: 1, max: 5 }))
        : [];

    const createdAt = faker.date.recent({ days: 45, refDate: now });
    const ann = await prisma.announcement.create({
      data: {
        title: randomFrom([
          'Quarterly OKR Alignment Session',
          'Security Awareness Week Kickoff',
          'Platform Maintenance Window',
          'New Client Onboarding Initiative',
          'Policy Update: External Data Sharing',
        ]),
        content: faker.lorem.paragraphs({ min: 2, max: 4 }),
        priority: randomFrom(['urgent', 'high', 'normal', 'low']),
        targetType,
        targetIds,
        attachments: chance(0.2)
          ? [
              { url: `https://cdn.siamdigital.co.th/announcement/${faker.string.uuid()}.pdf`, name: 'announcement-brief.pdf' },
            ]
          : undefined,
        createdBy: creator.id,
        expiresAt: chance(0.7) ? faker.date.soon({ days: 45, refDate: now }) : null,
        status: chance(0.82) ? 'active' : 'archived',
        createdAt,
        updatedAt: now,
      },
    });

    announcements.push({ id: ann.id, createdAt });
  }

  const announcementReadRows: Prisma.AnnouncementReadCreateManyInput[] = [];
  for (const ann of announcements) {
    const readers = faker.helpers.shuffle(users).slice(0, faker.number.int({ min: 8, max: 26 }));
    for (const reader of readers) {
      announcementReadRows.push({
        announcementId: ann.id,
        userId: reader.id,
        readAt: faker.date.between({ from: ann.createdAt, to: now }),
      });
    }
  }
  await prisma.announcementRead.createMany({ data: announcementReadRows, skipDuplicates: true });

  const refreshTokenRows: Prisma.RefreshTokenCreateManyInput[] = users.slice(0, 22).map((u) => ({
    userId: u.id,
    token: faker.string.alphanumeric(64),
    expiresAt: faker.date.soon({ days: 30, refDate: now }),
    createdAt: faker.date.recent({ days: 10, refDate: now }),
  }));
  await prisma.refreshToken.createMany({ data: refreshTokenRows });

  const auditRows: Prisma.AuditLogCreateManyInput[] = [];
  for (let i = 0; i < 220; i++) {
    const actor = chance(0.9) ? randomFrom(users) : null;
    const entity = randomFrom(['user', 'team', 'meeting', 'task', 'channel', 'message', 'document', 'workflow']);
    auditRows.push({
      action: randomFrom(['create', 'update', 'delete']),
      entity,
      entityId: faker.string.uuid(),
      userId: actor?.id ?? null,
      userName: actor?.name ?? 'System Job',
      details: {
        changeSummary: faker.hacker.phrase(),
        source: randomFrom(['web', 'api', 'scheduler']),
      },
      ipAddress: faker.internet.ip(),
      userAgent: faker.internet.userAgent(),
      createdAt: faker.date.recent({ days: 90, refDate: now }),
    });
  }
  await prisma.auditLog.createMany({ data: auditRows });

  console.log('✅ Realistic seed completed successfully');
  console.log(`Organization: 1`);
  console.log(`Users: ${users.length}`);
  console.log(`Teams: ${teams.length}`);
  console.log(`Projects: ${projects.length}`);
  console.log(`Meetings: ${meetings.length}`);
  console.log(`Tasks: ${tasks.length}`);
  console.log(`Channels: ${channels.length}`);
  console.log(`Messages: ${messages.length}`);
  console.log(`Announcements: ${announcements.length}`);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
