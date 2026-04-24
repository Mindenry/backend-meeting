import { PrismaClient, Prisma } from '@prisma/client';
import { fakerTH as faker } from '@faker-js/faker';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
faker.seed(20260405);

const now = new Date();
const passwordHash = bcrypt.hashSync('password123', 10);

// Helper functions
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const chance = (p: number) => Math.random() < p;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

async function main() {
  console.log('🌱 Seeding database with realistic data...');

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
            positions: ['CTO', 'Technical Lead', 'Senior Frontend Developer', 'Senior Backend Developer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Mobile Developer', 'DevOps Engineer'],
          },
          {
            name: 'Design & UX',
            positions: ['Design Director', 'UX Lead', 'UI Designer', 'UX Designer', 'Graphic Designer', 'Motion Designer'],
          },
          {
            name: 'Product',
            positions: ['Product Director', 'Product Manager', 'Product Owner', 'Business Analyst'],
          },
          {
            name: 'QA',
            positions: ['QA Lead', 'QA Engineer', 'Test Engineer', 'Automation Engineer'],
          },
          {
            name: 'DevOps & Infrastructure',
            positions: ['DevOps Lead', 'DevOps Engineer', 'Site Reliability Engineer', 'Cloud Engineer'],
          },
          {
            name: 'Project Management',
            positions: ['PM Director', 'Project Manager', 'Scrum Master', 'Technical Project Manager'],
          },
          {
            name: 'Marketing',
            positions: ['Marketing Manager', 'Content Writer', 'SEO Specialist', 'Social Media Manager'],
          },
          {
            name: 'Human Resources',
            positions: ['HR Manager', 'Recruiter', 'HR Specialist', 'People Operations'],
          },
          {
            name: 'Sales',
            positions: ['Sales Director', 'Account Executive', 'Sales Representative', 'Business Development'],
          },
          {
            name: 'Customer Success',
            positions: ['Customer Success Manager', 'Support Engineer', 'Technical Support'],
          },
        ],
      },
    },
  });

  // Role Permissions
  const rolePermissions: Prisma.RolePermissionCreateManyInput[] = [
    // Org Owner
    { organizationId: org.id, role: 'org_owner', resource: 'all', action: 'manage', allowed: true },
    // Admin
    { organizationId: org.id, role: 'admin', resource: 'users', action: 'manage', allowed: true },
    { organizationId: org.id, role: 'admin', resource: 'teams', action: 'manage', allowed: true },
    { organizationId: org.id, role: 'admin', resource: 'settings', action: 'manage', allowed: true },
    { organizationId: org.id, role: 'admin', resource: 'invites', action: 'manage', allowed: true },
    { organizationId: org.id, role: 'admin', resource: 'announcements', action: 'manage', allowed: true },
    // Manager
    { organizationId: org.id, role: 'manager', resource: 'tasks', action: 'manage', allowed: true },
    { organizationId: org.id, role: 'manager', resource: 'meetings', action: 'manage', allowed: true },
    { organizationId: org.id, role: 'manager', resource: 'reports', action: 'view', allowed: true },
    { organizationId: org.id, role: 'manager', resource: 'team_settings', action: 'edit', allowed: true },
    // Employee
    { organizationId: org.id, role: 'employee', resource: 'tasks', action: 'view', allowed: true },
    { organizationId: org.id, role: 'employee', resource: 'tasks', action: 'create', allowed: true },
    { organizationId: org.id, role: 'employee', resource: 'meetings', action: 'view', allowed: true },
    { organizationId: org.id, role: 'employee', resource: 'channels', action: 'view', allowed: true },
    { organizationId: org.id, role: 'employee', resource: 'drive', action: 'view', allowed: true },
    // Member
    { organizationId: org.id, role: 'member', resource: 'tasks', action: 'view', allowed: true },
    { organizationId: org.id, role: 'member', resource: 'channels', action: 'view', allowed: true },
  ];
  await prisma.rolePermission.createMany({ data: rolePermissions });

  // ============================================
  // Users (30 users)
  // ============================================
  const userData = [
    // Leadership
    { name: 'ธีรภัทร์ วัฒนกุล', email: 'teerapat@siamdigital.co.th', role: 'org_owner', dept: 'Engineering', pos: 'CTO' },
    { name: 'สมศักดิ์ ศรีสุข', email: 'somsak@siamdigital.co.th', role: 'admin', dept: 'Human Resources', pos: 'HR Manager' },
    { name: 'กัญญา ศรีสุข', email: 'kanya@siamdigital.co.th', role: 'admin', dept: 'Project Management', pos: 'PM Director' },
    
    // Managers
    { name: 'ภูวดล จิรากุล', email: 'phuwadon@siamdigital.co.th', role: 'manager', dept: 'Engineering', pos: 'Technical Lead' },
    { name: 'อริษา เทควงศ์', email: 'arisa@siamdigital.co.th', role: 'manager', dept: 'Design & UX', pos: 'Design Director' },
    { name: 'วิชัย พงษ์ไพบูลย์', email: 'wichai@siamdigital.co.th', role: 'manager', dept: 'Product', pos: 'Product Director' },
    { name: 'มานะ แก้วใส', email: 'mana@siamdigital.co.th', role: 'manager', dept: 'QA', pos: 'QA Lead' },
    { name: 'สุชาติ รักษาการ', email: 'suchat@siamdigital.co.th', role: 'manager', dept: 'DevOps & Infrastructure', pos: 'DevOps Lead' },
    { name: 'นภา สวยงาม', email: 'napa@siamdigital.co.th', role: 'manager', dept: 'Marketing', pos: 'Marketing Manager' },
    
    // Senior Engineers
    { name: 'ณัฐพงษ์ ประภาษ', email: 'nattapong@siamdigital.co.th', role: 'employee', dept: 'Engineering', pos: 'Senior Frontend Developer' },
    { name: 'พัชรา ลิ้มวงศ์', email: 'patchara@siamdigital.co.th', role: 'employee', dept: 'Engineering', pos: 'Senior Backend Developer' },
    { name: 'ธนกฤต มั่นคง', email: 'thanakrit@siamdigital.co.th', role: 'employee', dept: 'Engineering', pos: 'Full Stack Developer' },
    { name: 'สมชาย แสงรุ่ง', email: 'somchai@siamdigital.co.th', role: 'employee', dept: 'Engineering', pos: 'Senior Backend Developer' },
    { name: 'วรรณา จิตสำเนา', email: 'wanna@siamdigital.co.th', role: 'employee', dept: 'Engineering', pos: 'Senior Frontend Developer' },
    
    // Developers
    { name: 'ธีรพงษ์ แก้วใส', email: 'teerapong@siamdigital.co.th', role: 'employee', dept: 'Engineering', pos: 'Frontend Developer' },
    { name: 'สุดาวรรณ พงษ์ไพบูลย์', email: 'sudawan@siamdigital.co.th', role: 'employee', dept: 'Engineering', pos: 'Backend Developer' },
    { name: 'อนันต์ ชัยมงคล', email: 'anan@siamdigital.co.th', role: 'employee', dept: 'DevOps & Infrastructure', pos: 'DevOps Engineer' },
    { name: 'กิตติพงษ์ สุขสันต์', email: 'kittipong@siamdigital.co.th', role: 'employee', dept: 'Engineering', pos: 'Mobile Developer' },
    { name: 'ภัทรา นิรันดร', email: 'pattra@siamdigital.co.th', role: 'employee', dept: 'Engineering', pos: 'Backend Developer' },
    { name: 'ณรงค์ฤทธิ์ ศรีสวัสดิ์', email: 'narongrit@siamdigital.co.th', role: 'employee', dept: 'Engineering', pos: 'Full Stack Developer' },
    
    // Designers
    { name: 'วิภา สุขสันต์', email: 'wipa@siamdigital.co.th', role: 'employee', dept: 'Design & UX', pos: 'UI Designer' },
    { name: 'จิราภรณ์ แก้วมุข', email: 'jiraporn@siamdigital.co.th', role: 'employee', dept: 'Design & UX', pos: 'UX Designer' },
    { name: 'ธัญพิมล วงศ์กุล', email: 'thanyapimon@siamdigital.co.th', role: 'employee', dept: 'Design & UX', pos: 'Graphic Designer' },
    { name: 'อรุณี แสงสุข', email: 'arunee@siamdigital.co.th', role: 'employee', dept: 'Design & UX', pos: 'Motion Designer' },
    
    // Product & QA
    { name: 'พิมพ์ชนก รัตน์', email: 'pimchanok@siamdigital.co.th', role: 'employee', dept: 'QA', pos: 'QA Engineer' },
    { name: 'ธนพล ศรีเจริญ', email: 'thanapol@siamdigital.co.th', role: 'employee', dept: 'QA', pos: 'Test Engineer' },
    { name: 'อภิชาติ มั่นคง', email: 'apichat@siamdigital.co.th', role: 'employee', dept: 'Product', pos: 'Product Manager' },
    { name: 'วริทธิ์ สุขี', email: 'warit@siamdigital.co.th', role: 'employee', dept: 'Product', pos: 'Product Owner' },
    
    // Marketing & Sales
    { name: 'ณัฐวุฒิ พงษ์ศักดิ์', email: 'nattawut@siamdigital.co.th', role: 'employee', dept: 'Marketing', pos: 'Content Writer' },
    { name: 'พิชญา เจริญผล', email: 'pichaya@siamdigital.co.th', role: 'employee', dept: 'Marketing', pos: 'SEO Specialist' },
    { name: 'กมลวรรณ รักษ์ดี', email: 'kamonwan@siamdigital.co.th', role: 'employee', dept: 'Sales', pos: 'Account Executive' },
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
          activity: pick(['Available', 'In a meeting', 'Deep work', 'On break', 'Working remotely']),
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`,
          isActive: true,
          department: u.dept,
          position: u.pos,
          organizationId: org.id,
          lastActiveAt: faker.date.recent({ days: 3, refDate: now }),
          createdAt: new Date(2024, i % 12, (i % 28) + 1),
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

  console.log(`✅ Created ${users.length} users`);

  // ============================================
  // Teams (5 teams)
  // ============================================
  const teamData = [
    { name: 'Platform Team', desc: 'Backend & Infrastructure - Core platform development' },
    { name: 'Product Team', desc: 'Frontend & Mobile Apps - User-facing applications' },
    { name: 'Design Team', desc: 'UX/UI Design & Research - User experience and visual design' },
    { name: 'QA & Testing', desc: 'Quality Assurance - Testing and automation' },
    { name: 'DevOps Team', desc: 'Infrastructure & Deployment - Cloud and CI/CD' },
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

  // Team members (distribute users across teams)
  const teamMembers: Prisma.TeamMemberCreateManyInput[] = [];
  teams.forEach((team, i) => {
    const startIdx = i * 6;
    const teamUsers = users.slice(startIdx, startIdx + 7);
    teamUsers.forEach((u, j) => {
      teamMembers.push({
        teamId: team.id,
        userId: u.id,
        role: j === 0 ? 'admin' : j === 1 ? 'lead' : 'member',
      });
    });
  });
  // Add some cross-team members
  teamMembers.push(
    { teamId: teams[0].id, userId: users[0].id, role: 'admin' },
    { teamId: teams[1].id, userId: users[1].id, role: 'member' },
    { teamId: teams[2].id, userId: users[2].id, role: 'member' }
  );
  await prisma.teamMember.createMany({ data: teamMembers, skipDuplicates: true });

  console.log(`✅ Created ${teams.length} teams`);

  // ============================================
  // Projects, Components, Versions, Sprints, Epics
  // ============================================
  const projectData = [
    { key: 'PLAT', name: 'Platform Core', color: '#3B82F6' },
    { key: 'PROD', name: 'Product Portal', color: '#10B981' },
    { key: 'DSGN', name: 'Design System', color: '#8B5CF6' },
    { key: 'QA', name: 'Test Automation', color: '#F59E0B' },
    { key: 'INFRA', name: 'Infrastructure', color: '#EF4444' },
  ];

  const [projects, components, versions, sprints, epics] = await Promise.all([
    Promise.all(
      teams.map((team, i) =>
        prisma.project.create({
          data: {
            teamId: team.id,
            key: projectData[i].key,
            name: `${projectData[i].name} - ${team.name}`,
            description: `Main project for ${team.name}`,
            color: projectData[i].color,
          },
        }).then(p => ({ id: p.id, teamId: team.id, key: p.key, name: p.name }))
      )
    ),
    Promise.all(
      teams.flatMap(team =>
        range(2).map(i =>
          prisma.component.create({
            data: { teamId: team.id, name: `${team.name} Component ${i + 1}`, description: faker.lorem.sentence() },
          }).then(c => ({ id: c.id, teamId: team.id }))
        )
      )
    ),
    Promise.all(
      teams.flatMap(team =>
        range(3).map(i =>
          prisma.version.create({
            data: { 
              teamId: team.id, 
              name: `v${i + 1}.0.0`, 
              description: faker.lorem.sentence(),
              released: i < 2,
              releaseDate: i < 2 ? faker.date.past({ years: 1, refDate: now }) : null,
            },
          }).then(v => ({ id: v.id, teamId: team.id }))
        )
      )
    ),
    Promise.all(
      teams.flatMap(team =>
        range(3).map(i =>
          prisma.sprint.create({
            data: {
              name: `${team.name} Sprint ${i + 1}`,
              goal: faker.lorem.sentence(),
              teamId: team.id,
              createdById: managers[0].id,
              startDate: new Date(now.getTime() - (14 - i * 14) * 24 * 60 * 60 * 1000),
              endDate: new Date(now.getTime() - (7 - i * 14) * 24 * 60 * 60 * 1000),
              status: i === 2 ? 'active' : i === 1 ? 'closed' : 'planned',
            },
          }).then(s => ({ id: s.id, teamId: team.id }))
        )
      )
    ),
    Promise.all(
      teams.flatMap(team =>
        range(2).map(i =>
          prisma.epic.create({
            data: {
              name: `${team.name} Epic ${i + 1}`,
              description: faker.lorem.paragraph(),
              teamId: team.id,
              createdById: managers[0].id,
              color: pick(['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444']),
              status: pick(['active', 'completed', 'planned']),
            },
          }).then(e => ({ id: e.id, teamId: team.id }))
        )
      )
    ),
  ]);

  console.log(`✅ Created ${projects.length} projects, ${components.length} components, ${versions.length} versions, ${sprints.length} sprints, ${epics.length} epics`);

  // ============================================
  // Tasks (60 tasks)
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
    'Refactor legacy code',
    'Add unit tests for core modules',
    'Implement OAuth2 login',
    'Create email notification system',
    'Build REST API endpoints',
    'Implement WebSocket connections',
    'Add rate limiting',
    'Create backup system',
    'Implement audit logging',
    'Add two-factor authentication',
    'Create webhook system',
    'Implement batch processing',
    'Add internationalization support',
    'Create reporting dashboard',
    'Implement data export',
    'Add user permissions system',
    'Create team management',
    'Implement file versioning',
    'Add comment system',
    'Create activity feed',
    'Implement search indexing',
    'Add email templates',
    'Create notification center',
    'Implement task scheduling',
    'Add calendar integration',
    'Create meeting scheduler',
    'Implement video conferencing',
    'Add screen sharing',
    'Create recording system',
    'Implement transcription',
    'Add AI assistant',
    'Create knowledge base',
    'Implement wiki system',
    'Add document management',
    'Create workflow automation',
    'Implement approval system',
    'Add signature capture',
    'Create form builder',
    'Implement survey system',
    'Add analytics tracking',
    'Create performance dashboard',
    'Implement error tracking',
  ];

  const tasks = await Promise.all(
    taskTitles.slice(0, 60).map((title, i) => {
      const team = teams[i % teams.length];
      const project = projects.find(p => p.teamId === team.id)!;
      const teamSprints = sprints.filter(s => s.teamId === team.id);
      const teamEpics = epics.filter(e => e.teamId === team.id);
      const teamComponents = components.filter(c => c.teamId === team.id);
      const teamVersions = versions.filter(v => v.teamId === team.id);
      const teamUserIds = teamMembers.filter(tm => tm.teamId === team.id).map(tm => tm.userId);
      const assignee = pick(users.filter(u => teamUserIds.includes(u.id)));

      return prisma.task.create({
        data: {
          title,
          description: faker.lorem.paragraphs(2),
          status: pick(['todo', 'in_progress', 'review', 'done']),
          priority: pick(['low', 'medium', 'high', 'urgent']),
          issueType: pick(['task', 'bug', 'story', 'subtask']),
          teamId: team.id,
          assigneeId: assignee?.id,
          reporterId: pick(managers).id,
          projectId: project.id,
          sprintId: pick(teamSprints)?.id,
          epicId: pick(teamEpics)?.id,
          componentId: pick(teamComponents)?.id,
          versionId: pick(teamVersions)?.id,
          dueDate: faker.date.soon({ days: 30, refDate: now }),
          storyPoints: pick([1, 2, 3, 5, 8, 13]),
          estimate: faker.number.float({ min: 1, max: 20, fractionDigits: 1 }),
          tags: [pick(['frontend', 'backend', 'design', 'testing', 'documentation', 'feature', 'bugfix'])],
          createdAt: faker.date.past({ years: 1, refDate: now }),
        },
      }).then(t => ({ id: t.id, teamId: team.id, status: t.status, assigneeId: t.assigneeId }));
    })
  );

  console.log(`✅ Created ${tasks.length} tasks`);

  // ============================================
  // Subtasks, Attachments, Comments, Watchers
  // ============================================
  const subtasks: Prisma.SubtaskCreateManyInput[] = tasks.flatMap(t =>
    range(faker.number.int({ min: 1, max: 3 })).map(i => ({
      taskId: t.id,
      title: faker.hacker.phrase(),
      isCompleted: chance(0.3),
    }))
  );
  await prisma.subtask.createMany({ data: subtasks });

  const taskAttachments: Prisma.TaskAttachmentCreateManyInput[] = tasks.slice(0, 30).map(t => ({
    taskId: t.id,
    userId: pick(users).id,
    name: faker.system.commonFileName('pdf'),
    url: `https://files.siamdigital.co.th/${faker.string.uuid()}.pdf`,
    mimeType: 'application/pdf',
    size: faker.number.int({ min: 10000, max: 5000000 }),
  }));
  await prisma.taskAttachment.createMany({ data: taskAttachments });

  const taskComments: Prisma.TaskCommentCreateManyInput[] = tasks.flatMap(t =>
    range(faker.number.int({ min: 1, max: 5 })).map(() => ({
      taskId: t.id,
      userId: pick(users).id,
      text: faker.lorem.paragraph(),
    }))
  );
  await prisma.taskComment.createMany({ data: taskComments });

  const taskWatchers: Prisma.TaskWatcherCreateManyInput[] = tasks.flatMap(t =>
    range(faker.number.int({ min: 1, max: 3 })).map(() => ({
      taskId: t.id,
      userId: pick(users).id,
    }))
  );
  await prisma.taskWatcher.createMany({ data: taskWatchers, skipDuplicates: true });

  const issueLinks: Prisma.IssueLinkCreateManyInput[] = tasks.slice(0, 20).map((t, i) => ({
    sourceId: t.id,
    targetId: tasks[(i + 10) % tasks.length].id,
    type: pick(['relates', 'blocks', 'duplicates', 'clones']),
  }));
  await prisma.issueLink.createMany({ data: issueLinks, skipDuplicates: true });

  const taskActivityLogs: Prisma.TaskActivityLogCreateManyInput[] = tasks.flatMap(t =>
    range(faker.number.int({ min: 1, max: 4 })).map(() => ({
      taskId: t.id,
      action: pick(['created', 'status_changed', 'assigned', 'comment_added', 'priority_changed', 'due_date_changed']),
      userId: pick(users).id,
    }))
  );
  await prisma.taskActivityLog.createMany({ data: taskActivityLogs });

  console.log(`✅ Created subtasks, attachments, comments, watchers, issue links, activity logs`);

  // ============================================
  // Channels & Messages
  // ============================================
  const channelNames = ['general', 'announcements', 'random', 'standup', 'development', 'design'];
  const channels = await Promise.all(
    teams.flatMap(team =>
      channelNames.slice(0, 4).map(name =>
        prisma.channel.create({
          data: {
            teamId: team.id,
            name: `${team.name.toLowerCase().replace(/\s+/g, '-')}-${name}`,
            type: name === 'announcements' ? 'announcement' : 'general',
            description: `${team.name} ${name} channel`,
          },
        }).then(c => ({ id: c.id, teamId: c.teamId, name: c.name }))
      )
    )
  );

  // Messages (more realistic Thai messages)
  const thaiMessages = [
    'สวัสดีครับ วันนี้มีอะไรให้ช่วยไหมครับ?',
    'Reminder: วันนี้ 17:00 มี team meeting ครับ',
    '📢 ประกาศ: พรุ่งนี้จะมีการ deploy version ใหม่ครับ',
    '🎉 ยินดีด้วย! Sprint นี้เราผ่านเป้าหมายแล้ว',
    'ใครรู้จักเรื่องนี้บ้างครับ?',
    'ผมจะลองดูที่ code ส่วนนี้ครับ',
    'ต้องการ review code หน่อยครับ',
    'Bug นี้แก้เสร็จแล้วครับ ✅',
    'ขอ update progress หน่อยครับ',
    'วันนี้ทำอะไรเสร็จบ้างครับ?',
    'พรุ่งนี้มี meeting กี่โมงครับ?',
    'ช่วยส่ง document ให้หน่อยครับ',
    'เลื่อน meeting เป็นช่วงบ่ายได้ไหมครับ?',
    'ขอบคุณครับ 👍',
    'ดีมากครับ!',
    'เข้าใจแล้วครับ ขอบคุณครับ',
    'ผมจะติดตามเรื่องนี้ครับ',
    'มีปัญหาอะไรแจ้งได้เลยครับ',
    'Status update: กำลังดำเนินการอยู่ครับ',
    'เสร็จแล้วครับ ✨',
  ];

  const messages = await Promise.all(
    channels.flatMap(channel => {
      const teamUserIds = teamMembers.filter(tm => tm.teamId === channel.teamId).map(tm => tm.userId);
      const channelUsers = users.filter(u => teamUserIds.includes(u.id));
      
      return range(faker.number.int({ min: 5, max: 15 })).map(() => {
        const sender = pick(channelUsers);
        return prisma.message.create({
          data: {
            channelId: channel.id,
            senderId: sender.id,
            text: pick(thaiMessages),
            createdAt: faker.date.recent({ days: 7, refDate: now }),
          },
        }).then(m => ({ id: m.id, channelId: m.channelId, senderId: m.senderId, createdAt: m.createdAt }));
      });
    })
  );

  console.log(`✅ Created ${channels.length} channels, ${messages.length} messages`);

  // ============================================
  // Threads & Replies
  // ============================================
  const threadRoots = messages.slice(0, 30);
  const threads = await Promise.all(
    threadRoots.map(root =>
      prisma.thread.create({
        data: { messageId: root.id, channelId: root.channelId },
      }).then(t => ({ id: t.id, channelId: root.channelId, rootId: root.id }))
    )
  );

  // Thread replies
  await Promise.all(
    threads.flatMap(thread => {
      const channel = channels.find(c => c.id === thread.channelId)!;
      const teamUserIds = teamMembers.filter(tm => tm.teamId === channel.teamId).map(tm => tm.userId);
      const threadUsers = users.filter(u => teamUserIds.includes(u.id));
      
      return range(faker.number.int({ min: 1, max: 4 })).map(() =>
        prisma.message.create({
          data: {
            channelId: thread.channelId,
            senderId: pick(threadUsers).id,
            text: pick(thaiMessages),
            threadId: thread.id,
            replyToId: thread.rootId,
          },
        })
      );
    })
  );

  // Message Reads & Reactions
  const messageReads: Prisma.MessageReadCreateManyInput[] = messages.flatMap(msg => {
    const channel = channels.find(c => c.id === msg.channelId)!;
    const teamUserIds = teamMembers.filter(tm => tm.teamId === channel.teamId).map(tm => tm.userId);
    return users.filter(u => teamUserIds.includes(u.id)).slice(0, faker.number.int({ min: 2, max: 5 })).map(u => ({
      messageId: msg.id,
      userId: u.id,
    }));
  });
  await prisma.messageRead.createMany({ data: messageReads, skipDuplicates: true });

  const messageReactions: Prisma.MessageReactionCreateManyInput[] = messages.slice(0, 50).flatMap(msg => {
    const emojis = ['👍', '❤️', '😂', '🎉', '👀', '🔥', '✅', '🙏'];
    return range(faker.number.int({ min: 0, max: 3 })).map(() => ({
      messageId: msg.id,
      userId: pick(users).id,
      emoji: pick(emojis),
    }));
  });
  await prisma.messageReaction.createMany({ data: messageReactions, skipDuplicates: true });

  console.log(`✅ Created threads, replies, reads, reactions`);

  // ============================================
  // Meetings (20 meetings)
  // ============================================
  const meetingTypes = [
    { title: 'Daily Standup', duration: 15 },
    { title: 'Sprint Planning', duration: 60 },
    { title: 'Sprint Review', duration: 30 },
    { title: 'Sprint Retrospective', duration: 45 },
    { title: 'Design Review', duration: 30 },
    { title: 'Technical Discussion', duration: 45 },
    { title: '1:1 Meeting', duration: 30 },
    { title: 'Team Sync', duration: 20 },
    { title: 'Client Call', duration: 60 },
    { title: 'Interview', duration: 45 },
  ];

  const meetings = await Promise.all(
    range(20).map(i => {
      const team = teams[i % teams.length];
      const host = pick(users.filter(u => teamMembers.some(tm => tm.teamId === team.id && tm.userId === u.id)));
      const type = pick(meetingTypes);
      const startTime = faker.date.soon({ days: 14, refDate: now });
      
      return prisma.meeting.create({
        data: {
          title: `${type.title} - ${team.name}`,
          description: faker.lorem.sentence(),
          meetingCode: `${type.title.toLowerCase().replace(/\s+/g, '-')}-${faker.string.alphanumeric(6)}`,
          hostId: host.id,
          teamId: team.id,
          startTime,
          endTime: new Date(startTime.getTime() + type.duration * 60 * 1000),
          status: i < 5 ? 'ended' : i < 10 ? 'live' : 'scheduled',
          isRecurring: chance(0.3),
          recurringPattern: chance(0.3) ? pick(['daily', 'weekly', 'monthly']) : null,
        },
      }).then(m => ({ id: m.id, teamId: team.id, hostId: host.id }));
    })
  );

  // Meeting Participants
  const meetingParticipants: Prisma.MeetingParticipantCreateManyInput[] = meetings.flatMap(meeting => {
    const teamUserIds = teamMembers.filter(tm => tm.teamId === meeting.teamId).map(tm => tm.userId);
    const participants = users.filter(u => teamUserIds.includes(u.id)).slice(0, faker.number.int({ min: 3, max: 8 }));
    return participants.map(u => ({
      meetingId: meeting.id,
      userId: u.id,
      role: u.id === meeting.hostId ? 'host' : chance(0.2) ? 'co-host' : 'participant',
      joinedAt: faker.date.recent({ days: 1, refDate: now }),
      isMuted: chance(0.6),
      isVideoOn: chance(0.4),
    }));
  });
  await prisma.meetingParticipant.createMany({ data: meetingParticipants, skipDuplicates: true });

  // Meeting Reminders
  const meetingReminders: Prisma.MeetingReminderCreateManyInput[] = meetings.flatMap(m =>
    range(faker.number.int({ min: 1, max: 3 })).map(() => ({
      meetingId: m.id,
      userId: pick(users).id,
      minutesBefore: pick([5, 10, 15, 30]),
    }))
  );
  await prisma.meetingReminder.createMany({ data: meetingReminders, skipDuplicates: true });

  // Meeting Recordings
  const meetingRecordings: Prisma.MeetingRecordingCreateManyInput[] = meetings.slice(0, 8).map(m => ({
    meetingId: m.id,
    fileUrl: `https://recordings.siamdigital.co.th/${faker.string.uuid()}.mp4`,
    fileSize: faker.number.int({ min: 10000000, max: 500000000 }),
    duration: faker.number.int({ min: 600, max: 7200 }),
    status: pick(['processing', 'completed', 'completed', 'completed']),
    createdBy: pick(users).id,
  }));
  await prisma.meetingRecording.createMany({ data: meetingRecordings });

  // Meeting Minutes
  const meetingMinutes: Prisma.MeetingMinutesCreateManyInput[] = meetings.slice(0, 10).map(m => ({
    meetingId: m.id,
    title: `Minutes - ${faker.hacker.phrase()}`,
    content: faker.lorem.paragraphs(5),
    actionItems: [{ task: faker.hacker.phrase(), assignee: pick(users).name, dueDate: faker.date.soon({ days: 7 }).toISOString() }],
    decisions: [faker.hacker.phrase(), faker.hacker.phrase()],
    attendees: users.slice(0, faker.number.int({ min: 3, max: 6 })).map(u => u.id),
    createdBy: pick(users).id,
  }));
  await prisma.meetingMinutes.createMany({ data: meetingMinutes });

  console.log(`✅ Created ${meetings.length} meetings with participants, reminders, recordings, minutes`);

  // ============================================
  // Direct Messages
  // ============================================
  const dmPairs = [];
  for (let i = 0; i < 20; i++) {
    const sender = users[i % users.length];
    const receiver = users[(i + 5) % users.length];
    if (sender.id !== receiver.id) {
      dmPairs.push([sender, receiver]);
    }
  }

  await Promise.all(
    dmPairs.flatMap(([sender, receiver]) =>
      range(faker.number.int({ min: 2, max: 8 })).map(() =>
        prisma.directMessage.create({
          data: {
            senderId: sender.id,
            receiverId: receiver.id,
            text: pick(thaiMessages),
            createdAt: faker.date.recent({ days: 7, refDate: now }),
          },
        })
      )
    )
  );

  console.log(`✅ Created direct messages`);

  // ============================================
  // Documents & Folders
  // ============================================
  const folders = await Promise.all(
    teams.flatMap(team =>
      range(3).map(i =>
        prisma.documentFolder.create({
          data: {
            name: `${team.name} Documents ${i + 1}`,
            description: faker.lorem.sentence(),
            teamId: team.id,
            createdBy: pick(users).id,
          },
        }).then(f => ({ id: f.id, teamId: team.id }))
      )
    )
  );

  const documents = await Promise.all(
    folders.flatMap(folder =>
      range(faker.number.int({ min: 2, max: 5 })).map(() =>
        prisma.document.create({
          data: {
            name: faker.system.commonFileName('pdf'),
            description: faker.lorem.sentence(),
            folderId: folder.id,
            teamId: folder.teamId,
            fileUrl: `https://docs.siamdigital.co.th/${faker.string.uuid()}.pdf`,
            fileSize: faker.number.int({ min: 10000, max: 5000000 }),
            mimeType: pick(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel']),
            createdBy: pick(managers).id,
          },
        }).then(d => ({ id: d.id, folderId: folder.id }))
      )
    )
  );

  // Document versions
  const docVersions: Prisma.DocumentVersionCreateManyInput[] = documents.flatMap(d =>
    range(faker.number.int({ min: 1, max: 3 })).map(i => ({
      documentId: d.id,
      version: i + 1,
      fileUrl: `https://docs.siamdigital.co.th/${faker.string.uuid()}.pdf`,
      fileSize: faker.number.int({ min: 10000, max: 5000000 }),
      mimeType: 'application/pdf',
      changeNote: faker.lorem.sentence(),
      createdBy: pick(users).id,
    }))
  );
  await prisma.documentVersion.createMany({ data: docVersions });

  // Document permissions
  const docPerms: Prisma.DocumentPermissionCreateManyInput[] = documents.flatMap(d =>
    range(faker.number.int({ min: 1, max: 4 })).map(() => ({
      documentId: d.id,
      userId: pick(users).id,
      permission: pick(['view', 'edit', 'delete']),
    }))
  );
  await prisma.documentPermission.createMany({ data: docPerms, skipDuplicates: true });

  console.log(`✅ Created documents and folders`);

  // ============================================
  // Drive Entries
  // ============================================
  const driveEntries: Prisma.DriveEntryCreateManyInput[] = teams.flatMap(team => [
    { name: 'Documents', path: '/', isFolder: true, teamId: team.id, createdById: pick(users).id },
    { name: 'Reports', path: '/', isFolder: true, teamId: team.id, createdById: pick(users).id },
    { name: 'Presentations', path: '/', isFolder: true, teamId: team.id, createdById: pick(users).id },
    { name: 'project-spec.pdf', path: '/Documents', isFolder: false, teamId: team.id, createdById: pick(users).id },
    { name: 'quarterly-report.xlsx', path: '/Reports', isFolder: false, teamId: team.id, createdById: pick(users).id },
    { name: 'pitch-deck.pptx', path: '/Presentations', isFolder: false, teamId: team.id, createdById: pick(users).id },
  ]);
  await prisma.driveEntry.createMany({ data: driveEntries });

  // Drive file versions
  const driveFiles = await prisma.driveEntry.findMany({ where: { isFolder: false } });
  const driveFileVersions: Prisma.DriveFileVersionCreateManyInput[] = driveFiles.flatMap(f =>
    range(faker.number.int({ min: 1, max: 3 })).map(i => ({
      entryId: f.id,
      version: i + 1,
      storageKey: `${faker.string.uuid()}-${f.name}`,
      mimeType: pick(['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']),
      size: faker.number.int({ min: 10000, max: 5000000 }),
      createdById: pick(users).id,
    }))
  );
  await prisma.driveFileVersion.createMany({ data: driveFileVersions });

  // Drive permissions
  const drivePerms: Prisma.DrivePermissionCreateManyInput[] = driveFiles.flatMap(f =>
    range(faker.number.int({ min: 1, max: 3 })).map(() => ({
      entryId: f.id,
      userId: pick(users).id,
      permission: pick(['view', 'edit']),
    }))
  );
  await prisma.drivePermission.createMany({ data: drivePerms, skipDuplicates: true });

  console.log(`✅ Created drive entries with versions and permissions`);

  // ============================================
  // Time Entries
  // ============================================
  const timeEntries: Prisma.TimeEntryCreateManyInput[] = tasks.slice(0, 40).flatMap(t => {
    const start = faker.date.recent({ days: 14, refDate: now });
    return range(faker.number.int({ min: 1, max: 5 })).map(() => ({
      userId: t.assigneeId ?? pick(users).id,
      taskId: t.id,
      startTime: start,
      endTime: new Date(start.getTime() + faker.number.int({ min: 30, max: 480 }) * 60 * 1000),
      description: faker.lorem.sentence(),
      billable: chance(0.7),
      tags: [pick(['development', 'design', 'meeting', 'review', 'testing'])],
    }));
  });
  await prisma.timeEntry.createMany({ data: timeEntries });

  console.log(`✅ Created time entries`);

  // ============================================
  // Work Hours
  // ============================================
  const workHours: Prisma.WorkHoursCreateManyInput[] = users.flatMap(u =>
    range(7).map(i => ({
      userId: u.id,
      date: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
      hours: faker.number.float({ min: 6, max: 10, fractionDigits: 1 }),
      notes: chance(0.3) ? faker.lorem.sentence() : null,
    }))
  );
  await prisma.workHours.createMany({ data: workHours, skipDuplicates: true });

  console.log(`✅ Created work hours`);

  // ============================================
  // Reminders
  // ============================================
  const reminders = await Promise.all(
    users.slice(0, 15).map(u =>
      prisma.reminder.create({
        data: {
          title: faker.hacker.phrase(),
          description: faker.lorem.sentence(),
          type: pick(['meeting', 'task', 'custom']),
          remindAt: faker.date.soon({ days: 7, refDate: now }),
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

  console.log(`✅ Created reminders`);

  // ============================================
  // Holidays
  // ============================================
  await prisma.holiday.createMany({
    data: [
      { name: 'วันขึ้นปีใหม่', nameEn: 'New Year', date: new Date('2026-01-01'), type: 'public', country: 'TH', isRecurring: true, organizationId: org.id },
      { name: 'วันจักรี', nameEn: 'Chakri Day', date: new Date('2026-04-06'), type: 'public', country: 'TH', isRecurring: true, organizationId: org.id },
      { name: 'วันสงกรานต์', nameEn: 'Songkran', date: new Date('2026-04-13'), type: 'public', country: 'TH', isRecurring: true, organizationId: org.id },
      { name: 'วันฉัตรมงคล', nameEn: 'Coronation Day', date: new Date('2026-05-04'), type: 'public', country: 'TH', isRecurring: true, organizationId: org.id },
      { name: 'วันแรงงาน', nameEn: 'Labour Day', date: new Date('2026-05-01'), type: 'public', country: 'TH', isRecurring: true, organizationId: org.id },
      { name: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี", nameEn: "Queen's Birthday", date: new Date('2026-06-03'), type: 'public', country: 'TH', isRecurring: true, organizationId: org.id },
      { name: 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว', nameEn: "King's Birthday", date: new Date('2026-07-28'), type: 'public', country: 'TH', isRecurring: true, organizationId: org.id },
      { name: 'วันแม่แห่งชาติ', nameEn: "Mother's Day", date: new Date('2026-08-12'), type: 'public', country: 'TH', isRecurring: true, organizationId: org.id },
      { name: 'วันครู', nameEn: "Teacher's Day", date: new Date('2026-10-16'), type: 'public', country: 'TH', isRecurring: true, organizationId: org.id },
      { name: 'วันปิยมหาราช', nameEn: 'Piya Maharat Day', date: new Date('2026-10-23'), type: 'public', country: 'TH', isRecurring: true, organizationId: org.id },
      { name: 'วันลอยกระทง', nameEn: 'Loy Krathong', date: new Date('2026-11-03'), type: 'public', country: 'TH', isRecurring: false, organizationId: org.id },
      { name: 'วันพ่อแห่งชาติ', nameEn: "Father's Day", date: new Date('2026-12-05'), type: 'public', country: 'TH', isRecurring: true, organizationId: org.id },
      { name: 'วันสิ้นปี', nameEn: 'New Year Eve', date: new Date('2026-12-31'), type: 'public', country: 'TH', isRecurring: true, organizationId: org.id },
    ],
  });

  console.log(`✅ Created holidays`);

  // ============================================
  // Task Templates
  // ============================================
  const taskTemplates: Prisma.TaskTemplateCreateManyInput[] = teams.flatMap(team => [
    {
      name: 'Bug Report',
      title: 'Bug: ',
      description: 'Describe the bug, steps to reproduce, expected behavior',
      priority: 'medium',
      issueType: 'bug',
      tags: ['bug'],
      teamId: team.id,
      createdById: pick(managers).id,
    },
    {
      name: 'Feature Request',
      title: 'Feature: ',
      description: 'Describe the feature, user story, acceptance criteria',
      priority: 'medium',
      issueType: 'story',
      tags: ['feature'],
      teamId: team.id,
      createdById: pick(managers).id,
    },
    {
      name: 'Task',
      title: 'Task: ',
      description: 'Describe the task',
      priority: 'low',
      issueType: 'task',
      tags: ['task'],
      teamId: team.id,
      createdById: pick(managers).id,
    },
  ]);
  await prisma.taskTemplate.createMany({ data: taskTemplates });

  console.log(`✅ Created task templates`);

  // ============================================
  // Workflow Statuses
  // ============================================
  await prisma.taskWorkflowStatus.createMany({
    data: [
      { name: 'Backlog', key: 'backlog', color: '#94a3b8', category: 'todo', position: 0 },
      { name: 'To Do', key: 'todo', color: '#64748b', category: 'todo', position: 1 },
      { name: 'In Progress', key: 'in_progress', color: '#2563eb', category: 'doing', position: 2 },
      { name: 'In Review', key: 'review', color: '#8b5cf6', category: 'doing', position: 3 },
      { name: 'Testing', key: 'testing', color: '#f59e0b', category: 'doing', position: 4 },
      { name: 'Done', key: 'done', color: '#16a34a', category: 'done', position: 5 },
      { name: 'Blocked', key: 'blocked', color: '#ef4444', category: 'todo', position: 6 },
    ],
  });

  console.log(`✅ Created workflow statuses`);

  // ============================================
  // Workflows
  // ============================================
  const workflows = await Promise.all(
    teams.map(team =>
      prisma.workflow.create({
        data: {
          name: `Auto-assign ${team.name} tasks`,
          description: faker.lorem.sentence(),
          trigger: 'task_created',
          conditions: { teamId: team.id },
          actions: { assignTo: pick(users).id },
          teamId: team.id,
          createdBy: pick(managers).id,
        },
      }).then(w => ({ id: w.id }))
    )
  );

  const workflowRuns: Prisma.WorkflowRunCreateManyInput[] = workflows.flatMap(w =>
    range(faker.number.int({ min: 2, max: 5 })).map(() => ({
      workflowId: w.id,
      status: pick(['completed', 'completed', 'completed', 'failed']),
      input: { taskId: faker.string.uuid() },
      output: { success: true },
      userId: pick(users).id,
    }))
  );
  await prisma.workflowRun.createMany({ data: workflowRuns });

  console.log(`✅ Created workflows`);

  // ============================================
  // Wiki Articles
  // ============================================
  const wikiArticles = await Promise.all(
    teams.flatMap(team =>
      range(3).map(() =>
        prisma.wikiArticle.create({
          data: {
            title: faker.hacker.phrase(),
            content: faker.lorem.paragraphs(10),
            category: pick(['Engineering', 'Design', 'Process', 'Guidelines']),
            tags: [pick(['documentation', 'guide', 'reference', 'tutorial'])],
            teamId: team.id,
            createdBy: pick(managers).id,
            isPublic: chance(0.7),
          },
        }).then(a => ({ id: a.id, teamId: team.id }))
      )
    )
  );

  // Wiki versions
  const wikiVersions: Prisma.WikiArticleVersionCreateManyInput[] = wikiArticles.flatMap(a =>
    range(faker.number.int({ min: 1, max: 3 })).map(i => ({
      articleId: a.id,
      version: i + 1,
      title: faker.hacker.phrase(),
      content: faker.lorem.paragraphs(5),
      changeNote: faker.lorem.sentence(),
      createdBy: pick(users).id,
    }))
  );
  await prisma.wikiArticleVersion.createMany({ data: wikiVersions });

  // Wiki comments
  const wikiComments: Prisma.WikiCommentCreateManyInput[] = wikiArticles.flatMap(a =>
    range(faker.number.int({ min: 1, max: 3 })).map(() => ({
      articleId: a.id,
      content: faker.lorem.paragraph(),
      createdBy: pick(users).id,
    }))
  );
  await prisma.wikiComment.createMany({ data: wikiComments });

  console.log(`✅ Created wiki articles`);

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
        content: 'บริษัทจะหยุดทำการ วันที่ 13-17 เมษายน 2569 เนื่องในเทศกาลสงกรานต์ ขอให้สนุกกับวันหยุดครับ!',
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
    prisma.announcement.create({
      data: {
        title: 'เปิดตัว Feature ใหม่: Video Conference',
        content: 'ตอนนี้ทีมสามารถจัดประชุมวิดีโอได้โดยตรงในแอปแล้ว ลองใช้งานได้เลยครับ!',
        priority: 'normal',
        targetType: 'all',
        targetIds: [],
        createdBy: users[0].id,
        status: 'active',
      },
    }).then(a => ({ id: a.id })),
    prisma.announcement.create({
      data: {
        title: 'System Maintenance',
        content: 'ระบบจะปิดปรับปรุงวันอาทิตย์ที่ 10 เมษายน เวลา 02:00 - 06:00 น.',
        priority: 'high',
        targetType: 'all',
        targetIds: [],
        createdBy: users[4].id,
        status: 'active',
      },
    }).then(a => ({ id: a.id })),
  ]);

  // Announcement reads
  const announcementReads: Prisma.AnnouncementReadCreateManyInput[] = announcements.flatMap(a =>
    users.slice(0, faker.number.int({ min: 10, max: 25 })).map(u => ({
      announcementId: a.id,
      userId: u.id,
    }))
  );
  await prisma.announcementRead.createMany({ data: announcementReads, skipDuplicates: true });

  console.log(`✅ Created announcements`);

  // ============================================
  // Notifications & Preferences
  // ============================================
  await prisma.notificationPreference.createMany({
    data: users.map(u => ({
      userId: u.id,
      mentionDelivery: pick(['realtime', 'digest_hourly']),
      taskAssignedDelivery: 'realtime',
      meetingStartingDelivery: 'realtime',
      taskUpdateDelivery: pick(['digest_hourly', 'digest_daily']),
      meetingCreatedDelivery: pick(['digest_hourly', 'digest_daily']),
      messageDelivery: pick(['digest_hourly', 'digest_daily']),
      announcementDelivery: 'digest_daily',
      teamUpdateDelivery: 'digest_daily',
      soundEnabled: chance(0.8),
      desktopEnabled: chance(0.7),
      badgeEnabled: chance(0.9),
    })),
  });

  const notifications: Prisma.NotificationCreateManyInput[] = users.flatMap(u =>
    range(faker.number.int({ min: 3, max: 8 })).map(() => ({
      userId: u.id,
      type: pick(['task_assigned', 'meeting_created', 'message_mention', 'task_updated', 'announcement', 'meeting_reminder']),
      title: faker.hacker.phrase(),
      message: faker.lorem.sentence(),
      link: `/${pick(['tasks', 'meetings', 'channels'])}/${faker.string.uuid()}`,
      read: chance(0.4),
      priority: pick(['urgent', 'high', 'normal', 'low']),
    }))
  );
  await prisma.notification.createMany({ data: notifications });

  // Notification Digests
  const notificationDigests: Prisma.NotificationDigestCreateManyInput[] = users.slice(0, 15).map(u => ({
    userId: u.id,
    digestType: pick(['daily', 'weekly']),
    periodStart: faker.date.recent({ days: 1, refDate: now }),
    periodEnd: now,
    totalCount: faker.number.int({ min: 5, max: 30 }),
    unreadCount: faker.number.int({ min: 1, max: 10 }),
    byType: { task: faker.number.int({ min: 1, max: 5 }), meeting: faker.number.int({ min: 1, max: 3 }), message: faker.number.int({ min: 1, max: 10 }) },
    highlights: [faker.hacker.phrase(), faker.hacker.phrase()],
    sentAt: faker.date.recent({ days: 1, refDate: now }),
  }));
  await prisma.notificationDigest.createMany({ data: notificationDigests });

  console.log(`✅ Created notifications and preferences`);

  // ============================================
  // Invites
  // ============================================
  const invites: Prisma.InviteCreateManyInput[] = range(5).map(i => ({
    email: `newuser${i + 1}@siamdigital.co.th`,
    token: faker.string.alphanumeric(32),
    role: 'employee',
    teamId: pick(teams).id,
    teamRole: 'member',
    invitedBy: pick(managers).id,
    organizationId: org.id,
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    usedAt: chance(0.3) ? faker.date.recent({ days: 3, refDate: now }) : null,
  }));
  await prisma.invite.createMany({ data: invites });

  console.log(`✅ Created invites`);

  // ============================================
  // Refresh Tokens
  // ============================================
  const refreshTokens: Prisma.RefreshTokenCreateManyInput[] = users.map(u => ({
    userId: u.id,
    token: faker.string.alphanumeric(64),
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  }));
  await prisma.refreshToken.createMany({ data: refreshTokens });

  console.log(`✅ Created refresh tokens`);

  // ============================================
  // Audit Logs
  // ============================================
  const auditLogs: Prisma.AuditLogCreateManyInput[] = range(50).map(() => ({
    action: pick(['create', 'update', 'delete', 'view']),
    entity: pick(['user', 'team', 'meeting', 'task', 'channel', 'message', 'document']),
    entityId: faker.string.uuid(),
    userId: pick(users).id,
    userName: pick(users).name,
    details: { ip: faker.internet.ipv4(), userAgent: faker.internet.userAgent() },
    ipAddress: faker.internet.ipv4(),
    userAgent: faker.internet.userAgent(),
  }));
  await prisma.auditLog.createMany({ data: auditLogs });

  console.log(`✅ Created audit logs`);

  // ============================================
  // Summary
  // ============================================
  console.log('\n🎉 Seed completed successfully!');
  console.log('========================================');
  console.log(`📊 Summary:`);
  console.log(`   - ${users.length} users`);
  console.log(`   - ${teams.length} teams`);
  console.log(`   - ${projects.length} projects`);
  console.log(`   - ${tasks.length} tasks`);
  console.log(`   - ${channels.length} channels`);
  console.log(`   - ${messages.length} messages`);
  console.log(`   - ${meetings.length} meetings`);
  console.log(`   - ${documents.length} documents`);
  console.log(`   - ${wikiArticles.length} wiki articles`);
  console.log(`   - ${announcements.length} announcements`);
  console.log('========================================');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
