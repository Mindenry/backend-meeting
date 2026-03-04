import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IssueLinksService } from './issue-links.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('issue-links')
@UseGuards(JwtAuthGuard)
export class IssueLinksController {
  constructor(private readonly issueLinksService: IssueLinksService) {}

  @Post()
  create(
    @Body() body: { sourceId: string; targetId: string; type: string; userId?: string },
  ) {
    const { userId, ...data } = body;
    return this.issueLinksService.create(data, userId);
  }

  @Get()
  findByTaskId(@Query('taskId') taskId: string) {
    return this.issueLinksService.findByTaskId(taskId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.issueLinksService.remove(id, userId);
  }
}
