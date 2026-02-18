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
import { RepositoriesService } from './repositories.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('repositories')
@UseGuards(JwtAuthGuard)
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.repositoriesService.createRepository({
      ...body,
      ownerId: req.user.userId,
    });
  }

  @Get()
  findAll(
    @Query('teamId') teamId?: string,
    @Query('ownerId') ownerId?: string,
  ) {
    return this.repositoriesService.findAllRepositories({ teamId, ownerId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.repositoriesService.findOneRepository(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.repositoriesService.updateRepository(id, body, req.user.userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.repositoriesService.deleteRepository(id, req.user.userId);
  }

  // Branches
  @Post(':id/branches')
  createBranch(@Param('id') repositoryId: string, @Body() body: any) {
    return this.repositoriesService.createBranch({
      repositoryId,
      ...body,
    });
  }

  @Get(':id/branches')
  findAllBranches(@Param('id') repositoryId: string) {
    return this.repositoriesService.findAllBranches(repositoryId);
  }

  // Commits
  @Post(':id/commits')
  createCommit(@Param('id') repositoryId: string, @Body() body: any, @Request() req: any) {
    return this.repositoriesService.createCommit({
      repositoryId,
      authorId: req.user.userId,
      message: body.message,
      branch: body.branch || 'main',
      files: body.files || [],
    });
  }

  // Files
  @Get(':id/files')
  getFiles(@Param('id') repositoryId: string, @Query('path') filePath?: string) {
    return this.repositoriesService.getFiles(repositoryId, filePath);
  }

  @Get(':id/files/*')
  getFileContent(@Param('id') repositoryId: string, @Param('0') filePath: string, @Query('branch') branch?: string) {
    return this.repositoriesService.getFileContent(repositoryId, filePath, branch);
  }

  @Post(':id/files')
  createFile(@Param('id') repositoryId: string, @Body() body: any, @Request() req: any) {
    return this.repositoriesService.createFile(repositoryId, body.path, body.content, req.user.userId);
  }

  @Patch(':id/files/*')
  updateFile(@Param('id') repositoryId: string, @Param('0') filePath: string, @Body() body: any, @Request() req: any) {
    return this.repositoriesService.updateFile(repositoryId, filePath, body.content, body.message, req.user.userId);
  }

  @Delete(':id/files/*')
  deleteFile(@Param('id') repositoryId: string, @Param('0') filePath: string, @Body() body: any, @Request() req: any) {
    return this.repositoriesService.deleteFile(repositoryId, filePath, body.message, req.user.userId);
  }

  @Get(':id/commits')
  findAllCommits(
    @Param('id') repositoryId: string,
    @Query('branch') branch?: string,
    @Query('authorId') authorId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.repositoriesService.findAllCommits(repositoryId, {
      branch,
      authorId,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  // Pull Requests
  @Post(':id/pull-requests')
  createPullRequest(@Param('id') repositoryId: string, @Body() body: any, @Request() req: any) {
    return this.repositoriesService.createPullRequest({
      repositoryId,
      creatorId: req.user.userId,
      ...body,
    });
  }

  @Get(':id/pull-requests')
  findAllPullRequests(
    @Param('id') repositoryId: string,
    @Query('status') status?: string,
    @Query('creatorId') creatorId?: string,
  ) {
    return this.repositoriesService.findAllPullRequests(repositoryId, {
      status,
      creatorId,
    });
  }

  @Get('pull-requests/:prId')
  findOnePullRequest(@Param('prId') id: string) {
    return this.repositoriesService.findOnePullRequest(id);
  }

  @Patch('pull-requests/:prId')
  updatePullRequest(@Param('prId') id: string, @Body() body: any) {
    return this.repositoriesService.updatePullRequest(id, body);
  }

  // Reviews
  @Post('pull-requests/:prId/reviews')
  createReview(@Param('prId') pullRequestId: string, @Body() body: any, @Request() req: any) {
    return this.repositoriesService.createReview({
      pullRequestId,
      reviewerId: req.user.userId,
      ...body,
    });
  }

  // Code Comments
  @Post('pull-requests/:prId/comments')
  createCodeComment(@Param('prId') pullRequestId: string, @Body() body: any, @Request() req: any) {
    return this.repositoriesService.createCodeComment({
      pullRequestId,
      authorId: req.user.userId,
      ...body,
    });
  }

  @Patch('comments/:commentId/resolve')
  resolveComment(@Param('commentId') id: string) {
    return this.repositoriesService.resolveCodeComment(id);
  }

  // Link PR to Task
  @Post('pull-requests/:prId/link-task/:taskId')
  linkToTask(@Param('prId') prId: string, @Param('taskId') taskId: string) {
    return this.repositoriesService.linkPullRequestToTask(prId, taskId);
  }

  // Webhooks
  @Post(':id/webhooks')
  createWebhook(@Param('id') repositoryId: string, @Body() body: any) {
    return this.repositoriesService.createWebhook({
      repositoryId,
      ...body,
    });
  }

  @Post(':id/webhooks/git')
  handleGitWebhook(@Param('id') repositoryId: string, @Body() payload: any) {
    return this.repositoriesService.handleGitWebhook(repositoryId, payload);
  }
}
