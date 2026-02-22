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
import { MinutesModule } from './minutes/minutes.module';
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
import { MeetingRemindersModule } from './meeting-reminders/meeting-reminders.module';
import { HolidaysModule } from './holidays/holidays.module';
import { StorageModule } from './storage/storage.module';
import { CommonModule } from './common/common.module';
import { SearchModule } from './search/search.module';
import { StandupsModule } from './standups/standups.module';
import { WikiModule } from './wiki/wiki.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { CacheModule } from './common/cache/cache.module';
import { HealthModule } from './common/health/health.module';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule,
    // Serve frontend static files (only if dist folder exists)
    ...(require('fs').existsSync(join(process.cwd(), '..', 'team-connect-hub', 'dist'))
      ? [
          ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), '..', 'team-connect-hub', 'dist'),
            exclude: ['/api*', '/socket.io*'],
          }),
        ]
      : []),
    // Serve uploads
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    EventsModule,
    AuthModule,
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
    MeetingRemindersModule,
    HolidaysModule,
    NotificationsModule,
    ReactionsModule,
    ThreadsModule,
    DocumentsModule,
    RecordingsModule,
    MinutesModule,
    TimeTrackingModule,
    RemindersModule,
    ReportsModule,
    WorkflowsModule,
    StorageModule,
    CommonModule,
    SearchModule,
    StandupsModule,
    WikiModule,
    AnnouncementsModule,
    CacheModule,
    HealthModule,
  ],
  controllers: [AppController, UploadController, AuditController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggingMiddleware, RateLimitMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}

