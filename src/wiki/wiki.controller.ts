import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
} from '../common/decorators/swagger.decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WikiService } from './wiki.service';
import { PrismaService } from '../prisma/prisma.service';

type AuthenticatedRequest = {
  user: {
    id: string;
  };
};

type WikiArticlePayload = {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  teamId?: string;
};

@ApiTags('wiki')
@Controller('wiki')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WikiController {
  constructor(
    private readonly wikiService: WikiService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('articles')
  async findAll(@Request() req: AuthenticatedRequest) {
    // Get user's teams from database
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId: req.user.id },
      include: { team: true },
    });
    const teamIds = memberships.map((m) => m.team.id);

    // Pass all team IDs to the service
    return this.wikiService.findAll(req.user.id, teamIds);
  }

  @Get('articles/:id')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.wikiService.findOne(id, req.user.id);
  }

  @Post('articles')
  async create(
    @Body() body: WikiArticlePayload,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.wikiService.create({
      ...body,
      createdBy: req.user.id,
    });
  }

  @Put('articles/:id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<WikiArticlePayload>,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.wikiService.update(id, req.user.id, body);
  }

  @Delete('articles/:id')
  async delete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.wikiService.delete(id, req.user.id);
  }

  @Patch('articles/:id/view')
  async incrementView(@Param('id') id: string) {
    return this.wikiService.incrementViewCount(id);
  }

  @Post('articles/:id/comments')
  async addComment(
    @Param('id') articleId: string,
    @Body() body: { content: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.wikiService.addComment(articleId, req.user.id, body.content);
  }
}
