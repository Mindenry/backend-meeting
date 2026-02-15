import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.workflowsService.createWorkflow({
      ...body,
      createdBy: req.user.userId,
    });
  }

  @Get()
  findAll(
    @Query('teamId') teamId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.workflowsService.findAllWorkflows({
      teamId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workflowsService.findOneWorkflow(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.workflowsService.updateWorkflow(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.workflowsService.deleteWorkflow(id, req.user.userId);
  }

  @Post(':id/execute')
  execute(
    @Param('id') workflowId: string,
    @Body() body: { input: any },
    @Request() req?: any,
  ) {
    return this.workflowsService.executeWorkflow(
      workflowId,
      body.input,
      req?.user?.userId,
    );
  }

  @Get(':id/runs')
  getRuns(
    @Param('id') workflowId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workflowsService.getWorkflowRuns(workflowId, {
      status,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('trigger/:eventType')
  triggerWorkflow(
    @Param('eventType') eventType: string,
    @Body() body: { data: any },
  ) {
    return this.workflowsService.triggerWorkflow(eventType, body.data);
  }
}
