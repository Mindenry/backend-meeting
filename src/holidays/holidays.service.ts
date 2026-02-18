import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HolidaysService {
  private readonly logger = new Logger(HolidaysService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get Thai public holidays for a given year
   */
  async getThaiHolidays(year: number, organizationId?: string) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const orConditions: Array<{ organizationId: null } | { organizationId: string }> = [
      { organizationId: null },
    ];
    if (organizationId) {
      orConditions.push({ organizationId });
    }

    return this.prisma.holiday.findMany({
      where: {
        country: 'TH',
        date: {
          gte: startDate,
          lte: endDate,
        },
        OR: orConditions,
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  /**
   * Get holidays for a date range
   */
  async getHolidaysInRange(startDate: Date, endDate: Date, organizationId?: string) {
    const orConditions: Array<{ organizationId: null } | { organizationId: string }> = [
      { organizationId: null },
    ];
    if (organizationId) {
      orConditions.push({ organizationId });
    }

    return this.prisma.holiday.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        OR: orConditions,
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  /**
   * Check if a date is a holiday
   */
  async isHoliday(date: Date, organizationId?: string): Promise<boolean> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const orConditions: Array<{ organizationId: null } | { organizationId: string }> = [
      { organizationId: null },
    ];
    if (organizationId) {
      orConditions.push({ organizationId });
    }

    const count = await this.prisma.holiday.count({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        OR: orConditions,
      },
    });

    return count > 0;
  }

  /**
   * Create or update a holiday
   */
  async upsertHoliday(data: {
    name: string;
    nameEn?: string;
    date: Date;
    isRecurring?: boolean;
    type?: string;
    country?: string;
    organizationId?: string;
  }) {
    // For recurring holidays, find by name and date pattern
    if (data.isRecurring) {
      const year = data.date.getFullYear();
      const month = data.date.getMonth() + 1;
      const day = data.date.getDate();

      // Try to find existing recurring holiday
      const existing = await this.prisma.holiday.findFirst({
        where: {
          name: data.name,
          isRecurring: true,
          country: data.country || 'TH',
          organizationId: data.organizationId || null,
        },
      });

      if (existing) {
        // Update the pattern (we'll use the date as reference)
        return this.prisma.holiday.update({
          where: { id: existing.id },
          data: {
            nameEn: data.nameEn,
            date: data.date,
            type: data.type || 'public',
          },
        });
      }
    }

    return this.prisma.holiday.create({
      data: {
        name: data.name,
        nameEn: data.nameEn,
        date: data.date,
        isRecurring: data.isRecurring ?? true,
        type: data.type || 'public',
        country: data.country || 'TH',
        organizationId: data.organizationId || undefined,
      },
    });
  }

  /**
   * Initialize Thai public holidays for a year
   */
  async initializeThaiHolidays(year: number) {
    const holidays = this.getThaiHolidaysForYear(year);
    let created = 0;
    let updated = 0;

    for (const holiday of holidays) {
      const holidayDate = new Date(year, holiday.month - 1, holiday.day);
      
      // Check if holiday already exists for this date
      const existing = await this.prisma.holiday.findFirst({
        where: {
          name: holiday.name,
          date: {
            gte: new Date(year, holiday.month - 1, holiday.day, 0, 0, 0),
            lte: new Date(year, holiday.month - 1, holiday.day, 23, 59, 59),
          },
          country: 'TH',
          organizationId: null,
        },
      });

      if (existing) {
        await this.prisma.holiday.update({
          where: { id: existing.id },
          data: {
            nameEn: holiday.nameEn,
            type: holiday.type,
            isRecurring: true,
          },
        });
        updated++;
      } else {
        await this.prisma.holiday.create({
          data: {
            name: holiday.name,
            nameEn: holiday.nameEn,
            date: holidayDate,
            isRecurring: true,
            type: holiday.type,
            country: 'TH',
            organizationId: null,
          },
        });
        created++;
      }
    }

    this.logger.log(`Initialized Thai holidays for year ${year}: ${created} created, ${updated} updated`);
    return { created, updated, total: holidays.length };
  }

  /**
   * Get standard Thai public holidays (fixed dates)
   */
  private getThaiHolidaysForYear(year: number): Array<{
    name: string;
    nameEn: string;
    month: number;
    day: number;
    type: string;
  }> {
    // Fixed date holidays
    const fixedHolidays = [
      { name: 'วันขึ้นปีใหม่', nameEn: 'New Year\'s Day', month: 1, day: 1, type: 'public' },
      { name: 'วันมาฆบูชา', nameEn: 'Makha Bucha Day', month: 2, day: this.getMakhaBuchaDay(year), type: 'public' },
      { name: 'วันจักรี', nameEn: 'Chakri Memorial Day', month: 4, day: 6, type: 'public' },
      { name: 'วันสงกรานต์', nameEn: 'Songkran Festival', month: 4, day: 13, type: 'public' },
      { name: 'วันสงกรานต์', nameEn: 'Songkran Festival', month: 4, day: 14, type: 'public' },
      { name: 'วันสงกรานต์', nameEn: 'Songkran Festival', month: 4, day: 15, type: 'public' },
      { name: 'วันแรงงาน', nameEn: 'Labour Day', month: 5, day: 1, type: 'public' },
      { name: 'วันฉัตรมงคล', nameEn: 'Coronation Day', month: 5, day: 4, type: 'public' },
      { name: 'วันวิสาขบูชา', nameEn: 'Visakha Bucha Day', month: 5, day: this.getVisakhaBuchaDay(year), type: 'public' },
      { name: 'วันอาสาฬหบูชา', nameEn: 'Asarnha Bucha Day', month: 7, day: this.getAsarnhaBuchaDay(year), type: 'public' },
      { name: 'วันเข้าพรรษา', nameEn: 'Buddhist Lent Day', month: 7, day: this.getBuddhistLentDay(year), type: 'public' },
      { name: 'วันเฉลิมพระชนมพรรษา', nameEn: 'HM The Queen\'s Birthday', month: 8, day: 12, type: 'public' },
      { name: 'วันแม่แห่งชาติ', nameEn: 'Mother\'s Day', month: 8, day: 12, type: 'public' },
      { name: 'วันออกพรรษา', nameEn: 'End of Buddhist Lent', month: 10, day: this.getEndOfLentDay(year), type: 'public' },
      { name: 'วันปิยมหาราช', nameEn: 'King Chulalongkorn Day', month: 10, day: 23, type: 'public' },
      { name: 'วันเฉลิมพระชนมพรรษา', nameEn: 'HM The King\'s Birthday', month: 12, day: 5, type: 'public' },
      { name: 'วันพ่อแห่งชาติ', nameEn: 'Father\'s Day', month: 12, day: 5, type: 'public' },
      { name: 'วันรัฐธรรมนูญ', nameEn: 'Constitution Day', month: 12, day: 10, type: 'public' },
      { name: 'วันสิ้นปี', nameEn: 'New Year\'s Eve', month: 12, day: 31, type: 'public' },
    ];

    return fixedHolidays;
  }

  // Helper methods for calculating Buddhist holidays (approximate)
  private getMakhaBuchaDay(year: number): number {
    // Makha Bucha is usually in February, full moon day
    // This is a simplified calculation
    return 15; // Approximate
  }

  private getVisakhaBuchaDay(year: number): number {
    // Visakha Bucha is usually in May, full moon day
    return 15; // Approximate
  }

  private getAsarnhaBuchaDay(year: number): number {
    // Asarnha Bucha is usually in July, full moon day
    return 15; // Approximate
  }

  private getBuddhistLentDay(year: number): number {
    // Buddhist Lent is usually the day after Asarnha Bucha
    return 16; // Approximate
  }

  private getEndOfLentDay(year: number): number {
    // End of Lent is usually in October, full moon day
    return 15; // Approximate
  }

  /**
   * Delete a holiday
   */
  async deleteHoliday(id: string) {
    return this.prisma.holiday.delete({
      where: { id },
    });
  }

  /**
   * Get all holidays (admin)
   */
  async findAll(organizationId?: string) {
    const orConditions: Array<{ organizationId: null } | { organizationId: string }> = [
      { organizationId: null },
    ];
    if (organizationId) {
      orConditions.push({ organizationId });
    }

    return this.prisma.holiday.findMany({
      where: {
        OR: orConditions,
      },
      orderBy: {
        date: 'asc',
      },
    });
  }
}
