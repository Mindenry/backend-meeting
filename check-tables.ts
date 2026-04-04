import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Checking all tables...\n');
  
  const counts = {
    'Organization': await prisma.organization.count(),
    'User': await prisma.user.count(),
    'Team': await prisma.team.count(),
    'TeamMember': await prisma.teamMember.count(),
    'Meeting': await prisma.meeting.count(),
    'MeetingParticipant': await prisma.meetingParticipant.count(),
    'MeetingRecording': await prisma.meetingRecording.count(),
    'MeetingMinutes': await prisma.meetingMinutes.count(),
    'MeetingReminder': await prisma.meetingReminder.count(),
    'Task': await prisma.task.count(),
    'TaskComment': await prisma.taskComment.count(),
    'TaskActivityLog': await prisma.taskActivityLog.count(),
    'TaskAttachment': await prisma.taskAttachment.count(),
    'TaskWatcher': await prisma.taskWatcher.count(),
    'Subtask': await prisma.subtask.count(),
    'TaskTemplate': await prisma.taskTemplate.count(),
    'TaskWorkflowStatus': await prisma.taskWorkflowStatus.count(),
    'IssueLink': await prisma.issueLink.count(),
    'Channel': await prisma.channel.count(),
    'Message': await prisma.message.count(),
    'MessageRead': await prisma.messageRead.count(),
    'MessageReaction': await prisma.messageReaction.count(),
    'Thread': await prisma.thread.count(),
    'DirectMessage': await prisma.directMessage.count(),
    'Project': await prisma.project.count(),
    'Sprint': await prisma.sprint.count(),
    'Epic': await prisma.epic.count(),
    'Component': await prisma.component.count(),
    'Version': await prisma.version.count(),
    'Document': await prisma.document.count(),
    'DocumentFolder': await prisma.documentFolder.count(),
    'DocumentVersion': await prisma.documentVersion.count(),
    'DocumentPermission': await prisma.documentPermission.count(),
    'DriveEntry': await prisma.driveEntry.count(),
    'DriveFileVersion': await prisma.driveFileVersion.count(),
    'DrivePermission': await prisma.drivePermission.count(),
    'TimeEntry': await prisma.timeEntry.count(),
    'WorkHours': await prisma.workHours.count(),
    'Reminder': await prisma.reminder.count(),
    'ReminderRecipient': await prisma.reminderRecipient.count(),
    'Notification': await prisma.notification.count(),
    'NotificationPreference': await prisma.notificationPreference.count(),
    'NotificationDigest': await prisma.notificationDigest.count(),
    'Announcement': await prisma.announcement.count(),
    'AnnouncementRead': await prisma.announcementRead.count(),
    'WikiArticle': await prisma.wikiArticle.count(),
    'WikiArticleVersion': await prisma.wikiArticleVersion.count(),
    'WikiComment': await prisma.wikiComment.count(),
    'Holiday': await prisma.holiday.count(),
    'Invite': await prisma.invite.count(),
    'RefreshToken': await prisma.refreshToken.count(),
    'AuditLog': await prisma.auditLog.count(),
    'RolePermission': await prisma.rolePermission.count(),
  };

  console.log('┌─────────────────────────────┬───────┐');
  console.log('│ Table                       │ Count │');
  console.log('├─────────────────────────────┼───────┤');
  
  const entries = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  let total = 0;
  
  for (const [table, count] of entries) {
    const paddedTable = table.padEnd(27);
    const paddedCount = String(count).padStart(5);
    const status = count > 0 ? '✓' : '✗';
    console.log(`│ ${status} ${paddedTable} │ ${paddedCount} │`);
    total += count;
  }
  
  console.log('├─────────────────────────────┼───────┤');
  console.log(`│ TOTAL                       │ ${String(total).padStart(5)} │`);
  console.log('└─────────────────────────────┴───────┘');
  
  const emptyTables = entries.filter(([_, count]) => count === 0);
  if (emptyTables.length > 0) {
    console.log(`\n⚠️  Empty tables (${emptyTables.length}): ${emptyTables.map(([t]) => t).join(', ')}`);
  } else {
    console.log('\n✅ All tables have data!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
