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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WikiService } from './wiki.service';

@Controller('api/wiki')
@UseGuards(JwtAuthGuard)
export class WikiController {
  constructor(private readonly wikiService: WikiService) {}

  @Get('articles')
  async findAll(@Request() req) {
    return this.wikiService.findAll(req.user.id, req.user.teamId);
  }

  @Get('articles/:id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.wikiService.findOne(id, req.user.id);
  }

  @Post('articles')
  async create(@Body() body: any, @Request() req) {
    return this.wikiService.create({
      ...body,
      createdBy: req.user.id,
    });
  }

  @Put('articles/:id')
  async update(@Param('id') id: string, @Body() body: any, @Request() req) {
    return this.wikiService.update(id, req.user.id, body);
  }

  @Delete('articles/:id')
  async delete(@Param('id') id: string, @Request() req) {
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
    @Request() req,
  ) {
    return this.wikiService.addComment(articleId, req.user.id, body.content);
  }
}
