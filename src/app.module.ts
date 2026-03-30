import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UploadController } from './app.upload.controller';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { TeamsModule } from './teams/teams.module';
import { MeetingsModule } from './meetings/meetings.module';
import { TasksModule } from './tasks/tasks.module';
import { EventsModule } from './events/events.module';
import { ChannelsModule } from './channels/channels.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditController } from './common/audit.controller';
import { AuthModule } from './auth/auth.module';
import { ReactionsModule } from './reactions/reactions.module';
import { ThreadsModule } from './threads/threads.module';
import { DocumentsModule } from './documents/documents.module';
import { RecordingsModule } from './recordings/recordings.module';
import { TimeTrackingModule } from './time-tracking/time-tracking.module';
import { RemindersModule } from './reminders/reminders.module';
import { ReportsModule } from './reports/reports.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { InvitesModule } from './invites/invites.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { MeetingParticipantsModule } from './meeting-participants/meeting-participants.module';
import { TaskCommentsModule } from './task-comments/task-comments.module';
import { DriveModule } from './drive/drive.module';
import { SprintsModule } from './sprints/sprints.module';
import { EpicsModule } from './epics/epics.module';
import { ProjectsModule } from './projects/projects.module';
import { ComponentsModule } from './components/components.module';
import { VersionsModule } from './versions/versions.module';
import { MeetingRemindersModule } from './meeting-reminders/meeting-reminders.module';
import { HolidaysModule } from './holidays/holidays.module';
import { StorageModule } from './storage/storage.module';
import { CommonModule } from './common/common.module';
import { SearchModule } from './search/search.module';
import { WikiModule } from './wiki/wiki.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { PermissionsModule } from './permissions/permissions.module';
import { CacheModule } from './common/cache/cache.module';
import { HealthModule } from './common/health/health.module';
import { TaskStatusesModule } from './task-statuses/task-statuses.module';
import { IssueLinksModule } from './issue-links/issue-links.module';
import { TaskWatchersModule } from './task-watchers/task-watchers.module';
import { TaskActivityModule } from './task-activity/task-activity.module';
import { MeetingMinutesModule } from './meeting-minutes/meeting-minutes.module';
import { SeedModule } from './seed/seed.module';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule,
    // Serve frontend static files and uploads
    ServeStaticModule.forRoot(
      {
        rootPath: join(process.cwd(), 'uploads'),
        serveRoot: '/uploads',
      },
      ...(require('fs').existsSync(
        join(process.cwd(), '..', 'team-connect-hub', 'dist'),
      )
        ? [
            {
              rootPath: join(process.cwd(), '..', 'team-connect-hub', 'dist'),
              exclude: [
                '/api/{*path}',
                '/socket.io/{*path}',
                '/uploads/{*path}',
              ],
            },
          ]
        : []),
    ),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    EventsModule,
    InvitesModule,
    OrganizationsModule,
    MeetingParticipantsModule,
    NotificationsModule,
    TaskCommentsModule,
    ReportsModule,
    UsersModule,
    TeamsModule,
    MeetingsModule,
    TasksModule,
    ChannelsModule,
    MessagesModule,
    DriveModule,
    SprintsModule,
    EpicsModule,
    ProjectsModule,
    ComponentsModule,
    VersionsModule,
    MeetingRemindersModule,
    HolidaysModule,
    ReactionsModule,
    ThreadsModule,
    DocumentsModule,
    RecordingsModule,
    TimeTrackingModule,
    RemindersModule,
    WorkflowsModule,
    StorageModule,
    CommonModule,
    SearchModule,
    WikiModule,
    AnnouncementsModule,
    PermissionsModule,
    TaskStatusesModule,
    IssueLinksModule,
    TaskWatchersModule,
    TaskActivityModule,
    MeetingMinutesModule,
    HealthModule,
    SeedModule,
  ],
  controllers: [AppController, UploadController, AuditController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware, RateLimitMiddleware).forRoutes('*'); // Apply to all routes
  }
}
