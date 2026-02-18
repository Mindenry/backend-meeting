import { Module } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { RepositoriesController } from './repositories.controller';
import { GitService } from './git.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, EventsModule, NotificationsModule, CommonModule],
  providers: [RepositoriesService, GitService],
  controllers: [RepositoriesController],
  exports: [RepositoriesService, GitService],
})
export class RepositoriesModule {}
