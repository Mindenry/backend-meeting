import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('global')
  async globalSearch(
    @Query('q') query: string,
    @Query('types') types?: string,
    @Query('limit') limit?: string,
    @Query('teamId') teamId?: string,
    @Request() req?: any,
  ) {
    if (!query) {
      return { results: [] };
    }

    const results = await this.searchService.globalSearch(query, req.user.id, {
      types: types ? types.split(',') : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      teamId,
    });

    return { results, query, count: results.length };
  }
}
