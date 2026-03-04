const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function wipe() {
  const models = [
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
  for (const m of models) {
    if (prisma[m]) {
      console.log(`await prisma.${m}.deleteMany();`);
    }
  }
}
wipe().catch(console.error).finally(()=>prisma.$disconnect());
