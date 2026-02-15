import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
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
<<<<<<< HEAD
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
import { RepositoriesModule } from './repositories/repositories.module';
import { AIModule } from './ai/ai.module';
import { VirtualOfficeModule } from './virtual-office/virtual-office.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { AnalyticsModule } from './analytics/analytics.module';
=======
import { AuthModule } from './auth/auth.module';
import { InvitesModule } from './invites/invites.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { MeetingParticipantsModule } from './meeting-participants/meeting-participants.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TaskCommentsModule } from './task-comments/task-comments.module';
import { ReportsModule } from './reports/reports.module';
>>>>>>> fcc8e9c8dda5a4d582d762cef59437d32dbac700

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), '..', 'team-connect-hub', 'dist'),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
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
    NotificationsModule,
    ReactionsModule,
    ThreadsModule,
    DocumentsModule,
    RecordingsModule,
    MinutesModule,
    TimeTrackingModule,
    RemindersModule,
    ReportsModule,
    RepositoriesModule,
    AIModule,
    VirtualOfficeModule,
    WorkflowsModule,
    AnalyticsModule,
  ],
  controllers: [AppController, UploadController, AuditController],
  providers: [AppService],
})
export class AppModule { }

