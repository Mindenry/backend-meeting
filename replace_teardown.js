const fs = require('fs');
const path = require('path');

const seedFilePath = path.join(__dirname, 'prisma/seed.ts');
let seedContent = fs.readFileSync(seedFilePath, 'utf8');

const replacement = `  const modelsToWipe = [
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
  }`;

// Use regex to replace everything between "Clearing existing data..." and "// Hash password helper"
const regex = /console\.log\(['"]🧹 Clearing existing data\.\.\.['"]\);([\s\S]*?)\/\/\s*Hash password helper/;

if (regex.test(seedContent)) {
  seedContent = seedContent.replace(regex, `console.log('🧹 Clearing existing data...');\n${replacement}\n\n  // Hash password helper`);
  fs.writeFileSync(seedFilePath, seedContent);
  console.log("Teardown successfully injected via Regex!");
} else {
  console.error("Could not find regex bounds to replace teardown");
  process.exit(1);
}
