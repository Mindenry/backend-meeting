const fs = require('fs');
const path = require('path');

const seedFilePath = path.join(__dirname, 'prisma/seed.ts');
let seedContent = fs.readFileSync(seedFilePath, 'utf8');

const insertionPoint = 'console.log(\'\\n🎉 Seed completed successfully!\');';

const missingDataSeeds = `
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
`;

if (!seedContent.includes('// --- MISSING TABLE SEEDS ADDED AUTOMATICALLY ---')) {
  seedContent = seedContent.replace(insertionPoint, missingDataSeeds + '\n  ' + insertionPoint);
  fs.writeFileSync(seedFilePath, seedContent);
  console.log('Seed file successfully updated.');
} else {
  console.log('Seed file already updated.');
}
