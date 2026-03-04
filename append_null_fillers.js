const fs = require('fs');
const path = require('path');

const seedFilePath = path.join(__dirname, 'prisma/seed.ts');
let seedContent = fs.readFileSync(seedFilePath, 'utf8');

const insertionPoint = 'console.log(\'\\n🎉 Seed completed successfully!\');';

const nullFillers = `
  // --- FILLING OPTIONAL (NULL) FIELDS FOR COMPLETENESS ---
  console.log('🔄 Filling optional fields to remove nulls...');
  
  // 1. Update Users
  for (let i = 0; i < users.length; i++) {
    await prisma.user.update({
      where: { id: users[i].id },
      data: {
        displayName: users[i].name.split(' ')[0] + ' (Dev)',
        avatar: \`https://ui-avatars.com/api/?name=\${encodeURIComponent(users[i].name)}&background=random\`,
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
        aiSummary: 'The team aligned on the Q1 goals. No major blockers identified.',
        transcript: 'Speaker 1: Hello. Speaker 2: Hi everyone. ...',
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
`;

if (!seedContent.includes('// --- FILLING OPTIONAL (NULL) FIELDS FOR COMPLETENESS ---')) {
  seedContent = seedContent.replace(insertionPoint, nullFillers + '\n  ' + insertionPoint);
  fs.writeFileSync(seedFilePath, seedContent);
  console.log('Seed file successfully updated with null fillers.');
} else {
  console.log('Seed file already contains null fillers.');
}
