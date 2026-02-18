import { Module, OnModuleInit } from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import { HolidaysController } from './holidays.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [HolidaysService],
  controllers: [HolidaysController],
  exports: [HolidaysService],
})
export class HolidaysModule implements OnModuleInit {
  constructor(private readonly holidaysService: HolidaysService) {}

  async onModuleInit() {
    // Auto-initialize holidays for current year and next year on server start
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    try {
      // Check if holidays exist for current year
      const currentYearHolidays = await this.holidaysService.getThaiHolidays(currentYear);
      if (currentYearHolidays.length === 0) {
        await this.holidaysService.initializeThaiHolidays(currentYear);
      }

      // Check if holidays exist for next year
      const nextYearHolidays = await this.holidaysService.getThaiHolidays(nextYear);
      if (nextYearHolidays.length === 0) {
        await this.holidaysService.initializeThaiHolidays(nextYear);
      }
    } catch (error) {
      // Silently fail - holidays can be initialized manually via API
      console.error('Failed to auto-initialize holidays:', error);
    }
  }
}
