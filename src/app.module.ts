import { Module } from '@nestjs/common';
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
import { AuthModule } from './auth/auth.module';
import { InvitesModule } from './invites/invites.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { MeetingParticipantsModule } from './meeting-participants/meeting-participants.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TaskCommentsModule } from './task-comments/task-comments.module';
import { ReportsModule } from './reports/reports.module';
import { DriveModule } from './drive/drive.module';
import { CopilotModule } from './copilot/copilot.module';
import { SprintsModule } from './sprints/sprints.module';
import { EpicsModule } from './epics/epics.module';
import { MeetingRemindersModule } from './meeting-reminders/meeting-reminders.module';
import { HolidaysModule } from './holidays/holidays.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), '..', 'team-connect-hub', 'dist'),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
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
    CopilotModule,
    SprintsModule,
    EpicsModule,
    MeetingRemindersModule,
    HolidaysModule,
  ],
  controllers: [AppController, UploadController],
  providers: [AppService],
})
export class AppModule { }

