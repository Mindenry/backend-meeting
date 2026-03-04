const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMissing() {
  const models = [
    'organization', 'user', 'team', 'teamMember', 'meeting', 'task',
    'channel', 'message', 'directMessage', 'invite', 'taskComment',
    'taskActivityLog', 'messageRead', 'messageReaction', 'thread',
    'notification', 'notificationPreference', 'notificationDigest',
    'auditLog', 'refreshToken', 'documentFolder', 'document',
    'documentVersion', 'documentPermission', 'meetingRecording',
    'meetingMinutes', 'meetingParticipant', 'timeEntry', 'reminder',
    'reminderRecipient', 'standupEntry', 'driveEntry', 'driveFileVersion',
    'workHours', 'sprint', 'epic', 'subtask', 'taskAttachment',
    'meetingReminder', 'holiday', 'workflow', 'workflowRun',
    'wikiArticle', 'wikiArticleVersion', 'wikiComment', 'announcement',
    'announcementRead', 'project', 'component', 'version',
    'taskTemplate', 'taskWatcher', 'issueLink', 'rolePermission',
    'taskWorkflowStatus'
  ];

  const counts = {};
  for (const model of models) {
    if(prisma[model] && prisma[model].count) {
      counts[model] = await prisma[model].count();
    }
  }
  
  const emptyModels = [];
  const populatedModels = [];
  
  for (const [model, count] of Object.entries(counts)) {
    if (count === 0) {
      emptyModels.push(model);
    } else {
      populatedModels.push(`${model}: ${count}`);
    }
  }

  console.log('--- EMPTY TABLES (NEED SEEDS) ---');
  console.log(emptyModels.join('\n'));
  
  console.log('\n--- POPULATED TABLES ---');
  console.log(populatedModels.join('\n'));
}

checkMissing().catch(console.error).finally(() => prisma.$disconnect());
