import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { AuditService } from '../common/audit.service';

interface StandupMessagePayload {
  userId: string;
  teamId: string;
  text: string;
  createdAt?: Date;
}

@Injectable()
export class StandupsService implements OnModuleInit {
  private readonly logger = new Logger(StandupsService.name);
  private readonly timezone = 'Asia/Bangkok';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    try {
      const botUser = await this.ensureBotUser();
      const teams = await this.prisma.team.findMany({ select: { id: true } });

      await Promise.all(
        teams.map(async (team) => {
          await this.ensureBotMembership(team.id, botUser.id);
          await this.ensureStandupChannel(team.id);
        }),
      );

      this.logger.log('Standup bot initialized successfully');
    } catch (error) {
      this.logger.error(
        `Failed to initialize standup bot: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Daily cron: send standup prompt to each team's standup channel once per day
   * Runs every minute, but is idempotent per team/day by checking existing bot messages.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sendDailyPrompts() {
    try {
      const now = new Date();
      const { local, startOfDay } = this.getLocalDay(now);

      // Only send prompts during morning hours in Bangkok time
      const hour = local.getHours();
      if (hour < 8 || hour > 11) {
        return;
      }

      const botUser = await this.ensureBotUser();

      const teams = await this.prisma.team.findMany({
        select: { id: true, name: true },
      });

      for (const team of teams) {
        // Ensure standup channel exists
        const channel = await this.ensureStandupChannel(team.id);

        // Ensure bot account is a team member for visibility/auditing consistency
        await this.ensureBotMembership(team.id, botUser.id);

        // Check if we've already sent a standup prompt today in this channel
        const existingPrompt = await this.prisma.message.findFirst({
          where: {
            channelId: channel.id,
            isSystem: true,
            senderId: botUser.id,
            text: {
              contains: 'Daily standup for team',
              mode: 'insensitive',
            },
            createdAt: {
              gte: startOfDay,
            },
          },
        });

        if (existingPrompt) {
          continue;
        }

        const text = this.buildPromptMessage(team.name);

        const message = await this.prisma.message.create({
          data: {
            text,
            channelId: channel.id,
            senderId: botUser.id,
            isSystem: true,
          },
          include: {
            sender: true,
            channel: true,
          },
        });

        this.eventsGateway.emitMessageCreated(message);

        await this.auditService.log({
          action: 'create',
          entity: 'standup_prompt',
          entityId: message.id,
          userId: botUser.id,
          userName: botUser.name,
          details: { teamId: team.id, channelId: channel.id },
        });

        this.logger.log(
          `Sent daily standup prompt to team "${team.name}" (${team.id})`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error while sending standup prompts: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Called when a user posts a message in a standup channel.
   * Parses the message and upserts into StandupEntry for that user/day/team.
   */
  async handleStandupMessage(payload: StandupMessagePayload) {
    const { userId, teamId, text } = payload;
    if (!text || !text.trim()) return;

    const botUser = await this.ensureBotUser();
    if (userId === botUser.id) {
      // Ignore bot/system messages
      return;
    }

    const createdAt = payload.createdAt ?? new Date();
    const { startOfDay } = this.getLocalDay(createdAt);

    const parsed = this.parseStandupText(text);

    // Upsert standup entry for this user/team/day
    const existing = await this.prisma.standupEntry.findFirst({
      where: {
        userId,
        teamId,
        date: startOfDay,
      },
    });

    if (!existing) {
      await this.prisma.standupEntry.create({
        data: {
          userId,
          teamId,
          date: startOfDay,
          rawText: text,
          yesterday: parsed.yesterday,
          today: parsed.today,
          blockers: parsed.blockers,
        },
      });
    } else {
      // Merge arrays and append raw text
      const mergedYesterday = this.mergeArrays(
        existing.yesterday,
        parsed.yesterday,
      );
      const mergedToday = this.mergeArrays(existing.today, parsed.today);
      const mergedBlockers = this.mergeArrays(
        existing.blockers,
        parsed.blockers,
      );

      await this.prisma.standupEntry.update({
        where: { id: existing.id },
        data: {
          rawText: [existing.rawText, text].filter(Boolean).join('\n\n---\n\n'),
          yesterday: mergedYesterday,
          today: mergedToday,
          blockers: mergedBlockers,
        },
      });
    }
  }

  /**
   * Get today's standup entries for a team
   */
  async getTodayForTeam(teamId: string) {
    if (!teamId) {
      throw new BadRequestException('teamId is required');
    }

    const now = new Date();
    const { startOfDay, endOfDay } = this.getLocalDay(now);

    const entries = await this.prisma.standupEntry.findMany({
      where: {
        teamId,
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            status: true,
            activity: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return entries.map((e) => ({
      id: e.id,
      userId: e.userId,
      teamId: e.teamId,
      date: e.date,
      rawText: e.rawText,
      yesterday: e.yesterday,
      today: e.today,
      blockers: e.blockers,
      updatedAt: e.updatedAt,
      user: e.user,
    }));
  }

  /**
   * Get standup history for a team in a date range
   */
  async getHistoryForTeam(teamId: string, from?: Date, to?: Date) {
    if (!teamId) {
      throw new BadRequestException('teamId is required');
    }

    const todayInfo = this.getLocalDay(new Date());
    const start = from
      ? this.getLocalDay(from).startOfDay
      : todayInfo.startOfDay;
    const end = to ? this.getLocalDay(to).endOfDay : todayInfo.endOfDay;

    const entries = await this.prisma.standupEntry.findMany({
      where: {
        teamId,
        date: {
          gte: start,
          lt: end,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return entries;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private async ensureBotUser() {
    const email = 'standup-bot@system.local';

    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Use any existing organization as the bot's org
      const org =
        (await this.prisma.organization.findFirst()) ||
        (await this.prisma.organization.create({
          data: {
            name: 'Default Organization',
            domain: 'example.com',
          },
        }));

      user = await this.prisma.user.create({
        data: {
          email,
          name: 'Standup Bot',
          role: 'system',
          organizationId: org.id,
          activity: 'Automated standup assistant',
          status: 'online',
        },
      });
    }

    return user;
  }

  private async ensureBotMembership(teamId: string, botUserId: string) {
    const existingMembership = await this.prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: botUserId,
          teamId,
        },
      },
    });

    if (!existingMembership) {
      await this.prisma.teamMember.create({
        data: {
          userId: botUserId,
          teamId,
          role: 'member',
        },
      });
    }
  }

  private async ensureStandupChannel(teamId: string) {
    const channelName = 'standup';

    const existing =
      (await this.prisma.channel.findFirst({
        where: {
          teamId,
          name: channelName,
        },
      })) ||
      (await this.prisma.channel.create({
        data: {
          teamId,
          name: channelName,
          type: 'standup',
          description: 'Daily standup and status updates',
        },
      }));

    return existing;
  }

  private buildPromptMessage(teamName: string) {
    return [
      `👋 Daily standup for team ${teamName}`,
      '',
      'ตอบในช่องนี้โดยใช้ template ต่อไปนี้ (ตอบได้ทั้งภาษาไทยและอังกฤษ):',
      '',
      '✅ Yesterday: อะไรที่ทำเสร็จไปแล้ว',
      '📝 Today: วันนี้จะทำอะไร',
      '⚠️ Blockers: ติดขัดอะไรอยู่',
      '',
      'ตัวอย่าง:',
      '✅ Fixed login bug (TASK-123)',
      '📝 Implement payment flow',
      '⚠️ Waiting for API from payment team',
    ].join('\n');
  }

  private parseStandupText(text: string): {
    yesterday: string[];
    today: string[];
    blockers: string[];
  } {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const yesterday: string[] = [];
    const today: string[] = [];
    const blockers: string[] = [];

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (
        line.startsWith('✅') ||
        lower.startsWith('yesterday') ||
        lower.startsWith('เมื่อวาน')
      ) {
        yesterday.push(line.replace(/^✅\s*/u, '').trim());
      } else if (
        line.startsWith('📝') ||
        lower.startsWith('today') ||
        lower.startsWith('วันนี้') ||
        lower.startsWith('plan')
      ) {
        today.push(line.replace(/^📝\s*/u, '').trim());
      } else if (
        line.startsWith('⚠️') ||
        lower.startsWith('blocker') ||
        lower.startsWith('blocked') ||
        lower.startsWith('ติดขัด') ||
        lower.startsWith('ปัญหา')
      ) {
        blockers.push(line.replace(/^⚠️\s*/u, '').trim());
      }
    }

    // Fallback: if nothing matched, treat whole message as "today"
    if (
      yesterday.length === 0 &&
      today.length === 0 &&
      blockers.length === 0 &&
      text.trim()
    ) {
      today.push(text.trim());
    }

    return { yesterday, today, blockers };
  }

  private mergeArrays(existing: string[], incoming: string[]): string[] {
    const set = new Set<string>(existing || []);
    for (const item of incoming || []) {
      if (item && !set.has(item)) {
        set.add(item);
      }
    }
    return Array.from(set);
  }

  /**
   * Convert JS Date to local day in configured timezone (Bangkok)
   */
  private getLocalDay(date: Date) {
    const local = new Date(
      date.toLocaleString('en-US', {
        timeZone: this.timezone,
      }),
    );

    const startOfDay = new Date(local);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return { local, startOfDay, endOfDay };
  }
}
