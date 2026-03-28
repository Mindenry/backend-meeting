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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
} from '../common/decorators/swagger.decorators';
import { WorkflowsService } from './workflows.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type WorkflowCondition = {
  field: string;
  operator: string;
  value: unknown;
};

type WorkflowAction = {
  type: string;
  [key: string]: unknown;
};

type WorkflowPayload = {
  name: string;
  description?: string;
  trigger: string;
  conditions?: WorkflowCondition[];
  actions: WorkflowAction[];
  teamId?: string;
  isActive?: boolean;
};

type AuthenticatedWorkflowRequest = {
  user: {
    userId?: string;
    id?: string;
  };
};

function resolveActorId(req: AuthenticatedWorkflowRequest): string {
  const actorId = req.user.userId ?? req.user.id;
  if (!actorId) {
    throw new BadRequestException('Missing authenticated user id');
  }
  return actorId;
}

@ApiTags('workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  create(
    @Body() body: WorkflowPayload,
    @Request() req: AuthenticatedWorkflowRequest,
  ) {
    return this.workflowsService.createWorkflow({
      ...body,
      createdBy: resolveActorId(req),
    });
  }

  @Get()
  findAll(
    @Query('teamId') teamId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.workflowsService.findAllWorkflows({
      teamId,
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workflowsService.findOneWorkflow(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<WorkflowPayload>) {
    return this.workflowsService.updateWorkflow(id, body);
  }

  @Delete(':id')
  delete(
    @Param('id') id: string,
    @Request() req: AuthenticatedWorkflowRequest,
  ) {
    return this.workflowsService.deleteWorkflow(id, resolveActorId(req));
  }

  @Post(':id/execute')
  execute(
    @Param('id') workflowId: string,
    @Body() body: { input: unknown },
    @Request() req?: AuthenticatedWorkflowRequest,
  ) {
    const actorId = req ? resolveActorId(req) : undefined;
    return this.workflowsService.executeWorkflow(
      workflowId,
      body.input,
      actorId,
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
    @Body() body: { data: Record<string, unknown> },
  ) {
    return this.workflowsService.triggerWorkflow(eventType, body.data);
  }
}
