import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StandupsService } from './standups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('standups')
@UseGuards(JwtAuthGuard)
export class StandupsController {
  constructor(private readonly standupsService: StandupsService) {}

  @Get('today')
  getToday(@Query('teamId') teamId: string) {
    return this.standupsService.getTodayForTeam(teamId);
  }

  @Get('history')
  getHistory(
    @Query('teamId') teamId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.standupsService.getHistoryForTeam(
      teamId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}

