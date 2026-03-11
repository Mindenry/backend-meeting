import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('holidays')
@UseGuards(JwtAuthGuard)
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @Get()
  async findAll(@Query('organizationId') organizationId?: string) {
    return this.holidaysService.findAll(organizationId);
  }

  @Get('year/:year')
  async getByYear(
    @Param('year', ParseIntPipe) year: number,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.holidaysService.getThaiHolidays(year, organizationId);
  }

  @Get('range')
  async getInRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.holidaysService.getHolidaysInRange(
      new Date(startDate),
      new Date(endDate),
      organizationId,
    );
  }

  @Get('check')
  async checkHoliday(
    @Query('date') date: string,
    @Query('organizationId') organizationId?: string,
  ) {
    const isHoliday = await this.holidaysService.isHoliday(
      new Date(date),
      organizationId,
    );
    return { isHoliday };
  }

  @Post()
  async createHoliday(
    @Body()
    body: {
      name: string;
      nameEn?: string;
      date: string;
      isRecurring?: boolean;
      type?: string;
      country?: string;
      organizationId?: string;
    },
  ) {
    return this.holidaysService.upsertHoliday({
      ...body,
      date: new Date(body.date),
    });
  }

  @Post('initialize/:year')
  async initializeYear(@Param('year', ParseIntPipe) year: number) {
    await this.holidaysService.initializeThaiHolidays(year);
    return { success: true, message: `Initialized holidays for year ${year}` };
  }

  @Delete(':id')
  async deleteHoliday(@Param('id') id: string) {
    await this.holidaysService.deleteHoliday(id);
    return { success: true };
  }
}
