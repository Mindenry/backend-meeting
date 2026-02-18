import { Injectable, NotFoundException, Inject, forwardRef, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../common/audit.service';
import { randomBytes } from 'crypto';
import { hashPassword } from '../auth/password';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  private readonly logger = new Logger(MeetingsService.name);

  private geminiClient = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

  private ensureGeminiConfigured() {
    if (!this.geminiClient) {
      throw new InternalServerErrorException(
        'Gemini API key is not configured. Please set GEMINI_API_KEY in backend .env file.',
      );
    }
  }

  generateMeetingCode(): string {
    // Generate a 9-digit meeting code
    return randomBytes(4).toString('hex').substring(0, 9).toUpperCase();
  }

  findAll(params?: { status?: string; teamId?: string; hostId?: string }) {
    const { status, teamId, hostId } = params || {};
    return this.prisma.meeting.findMany({
      where: {
        status: status || undefined,
        teamId: teamId || undefined,
        hostId: hostId || undefined,
      },
      include: {
        team: true,
        host: true,
        tasks: true,
        participants: {
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
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.meeting.findUnique({
      where: { id },
      include: {
        team: true,
        host: true,
        tasks: true,
        participants: {
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
        },
        recordings: true,
        minutes: true,
      },
    });
  }

  findByCode(meetingCode: string) {
    return this.prisma.meeting.findUnique({
      where: { meetingCode },
      include: {
        team: true,
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        participants: {
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
        },
      },
    });
  }

  async create(data: {
    title: string;
    description?: string;
    startTime: Date;
    endTime?: Date;
    password?: string;
    waitingRoom?: boolean;
    allowScreenShare?: boolean;
    status?: string;
    teamId?: string | null;
    hostId: string;
    isInstant?: boolean;
    isRecurring?: boolean;
    recurringPattern?: string;
    recurringDays?: number[];
    recurringEndDate?: Date;
  }) {
    let meetingCode = this.generateMeetingCode();
    // Ensure unique meeting code
    while (await this.prisma.meeting.findUnique({ where: { meetingCode } })) {
      meetingCode = this.generateMeetingCode();
    }

    const meeting = await this.prisma.meeting.create({
      data: {
        ...data,
        password: data.password ? hashPassword(data.password) : undefined,
        meetingCode,
        status: data.status || (data.isInstant ? 'live' : 'scheduled'),
        actualStartTime: data.isInstant ? new Date() : undefined,
        isRecurring: data.isRecurring || false,
        recurringPattern: data.recurringPattern,
        recurringDays: data.recurringDays || [],
        recurringEndDate: data.recurringEndDate,
      },
      include: {
        team: true,
        host: true,
        participants: true,
      },
    });

    // If recurring, generate instances
    if (data.isRecurring && data.recurringPattern) {
      await this.generateRecurringInstances(meeting.id);
    }

    this.eventsGateway.emitMeetingCreated(meeting);
    
    // Audit log
    await this.auditService.log({
      action: 'create',
      entity: 'meeting',
      entityId: meeting.id,
      userId: meeting.hostId,
      userName: meeting.host.name,
      details: { title: meeting.title, teamId: meeting.teamId, startTime: meeting.startTime },
    });
    
    // Create notifications for team members if meeting is team-based
    if (meeting.teamId) {
      try {
        const teamMembers = await this.prisma.teamMember.findMany({
          where: { teamId: meeting.teamId },
          include: { user: true },
        });
        
        const notifications = teamMembers
          .filter(m => m.userId !== meeting.hostId)
          .map(member => 
            this.notificationsService.create({
              userId: member.userId,
              type: 'meeting_created',
              title: 'New meeting scheduled',
              message: `${meeting.host.name} scheduled: ${meeting.title}`,
              relatedId: meeting.id,
              relatedType: 'meeting',
            }).catch(err => {
              console.error(`Failed to create notification for user ${member.userId}:`, err);
            })
          );
        
        await Promise.allSettled(notifications);
      } catch (err) {
        console.error('Failed to create meeting notifications:', err);
      }
    }
    
    return meeting;
  }

  async startMeeting(id: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');

    return this.prisma.meeting.update({
      where: { id },
      data: {
        status: 'live',
        actualStartTime: new Date(),
      },
      include: {
        team: true,
        host: true,
        participants: {
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
        },
      },
    });
  }

  async endMeeting(id: string, summary?: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');

    return this.prisma.meeting.update({
      where: { id },
      data: {
        status: 'ended',
        actualEndTime: new Date(),
        summary,
      },
      include: {
        team: true,
        host: true,
        participants: {
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
        },
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      description?: string;
      startTime: Date;
      endTime: Date;
      waitingRoom: boolean;
      allowScreenShare: boolean;
      status: string;
      teamId?: string | null;
    }>,
  ) {
    const exists = await this.prisma.meeting.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Meeting not found');
    const meeting = await this.prisma.meeting.update({
      where: { id },
      data,
      include: {
        team: true,
        host: true,
      },
    });
    this.eventsGateway.emitMeetingUpdated(meeting);
    
    // Audit log
    await this.auditService.log({
      action: 'update',
      entity: 'meeting',
      entityId: meeting.id,
      userId: meeting.hostId,
      userName: meeting.host.name,
      details: { 
        changes: Object.keys(data),
        title: meeting.title,
        status: meeting.status,
      },
    });
    
    return meeting;
  }

  async remove(id: string) {
    const exists = await this.prisma.meeting.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Meeting not found');
    
    // Audit log before delete
    await this.auditService.log({
      action: 'delete',
      entity: 'meeting',
      entityId: id,
      userId: exists.hostId,
      details: { title: exists.title },
    });
    
    await this.prisma.meeting.delete({ where: { id } });
    this.eventsGateway.emitMeetingDeleted(id);
    return { success: true };
  }

  // Participants
  async joinMeeting(meetingId: string, userId: string, role: string = 'participant') {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const participant = await this.prisma.meetingParticipant.upsert({
      where: {
        meetingId_userId: { meetingId, userId },
      },
      update: {
        joinedAt: new Date(),
        leftAt: null,
        role,
      },
      create: {
        meetingId,
        userId,
        role,
        joinedAt: new Date(),
      },
    });

    await this.auditService.log({
      action: 'join',
      entity: 'meeting_participant',
      entityId: participant.id,
      userId,
      details: { meetingId, role },
    });

    return participant;
  }

  async leaveMeeting(meetingId: string, userId: string) {
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: { meetingId, userId },
      },
    });

    if (!participant) {
      return { success: true };
    }

    const leftAt = new Date();
    const duration = Math.floor(
      (leftAt.getTime() - participant.joinedAt.getTime()) / 1000,
    );

    await this.prisma.meetingParticipant.update({
      where: {
        meetingId_userId: { meetingId, userId },
      },
      data: {
        leftAt,
        duration,
      },
    });

    await this.auditService.log({
      action: 'leave',
      entity: 'meeting_participant',
      entityId: participant.id,
      userId,
      details: { meetingId, duration },
    });

    return { success: true };
  }

  async getParticipants(meetingId: string) {
    return this.prisma.meetingParticipant.findMany({
      where: { meetingId },
      include: {
        user: true,
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async lockMeeting(id: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');

    return this.prisma.meeting.update({
      where: { id },
      data: { isLocked: true },
    });
  }

  async unlockMeeting(id: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');

    return this.prisma.meeting.update({
      where: { id },
      data: { isLocked: false },
    });
  }

  async updateSummary(id: string, summary: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');

    return this.prisma.meeting.update({
      where: { id },
      data: { summary },
    });
  }

  async generateAiSummary(meetingId: string) {
    /**
     * เป้าหมายของฟังก์ชันนี้:
     * - ถ้ามี Gemini + มีข้อความแชท จะใช้ AI สรุปประชุม (เหมือนเดิม)
     * - ถ้าไม่มี Gemini / ไม่มีข้อความแชท / AI ล้มเหลว → ใช้ fallback แบบ rule‑based
     *   โดยต้อง "ไม่" โยน error 4xx/5xx ออกไป ให้ frontend ใช้ได้เสมอ
     */

    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        team: true,
        host: true,
        tasks: true,
        participants: {
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
        },
      },
    });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 1) พยายามดึง transcript จากแชท (ถ้ามีทีม + channel)
    // ─────────────────────────────────────────────────────────────────────────────
    let transcriptText = '';
    try {
      if (meeting.teamId) {
        const channelName = `meeting-${meeting.meetingCode || meeting.id.slice(0, 8)}`;
        const channel = await this.prisma.channel.findFirst({
          where: {
            teamId: meeting.teamId,
            name: channelName,
          },
        });

        if (channel) {
          const messages = await this.prisma.message.findMany({
            where: { channelId: channel.id },
            orderBy: { createdAt: 'asc' },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            take: 500,
          });

          if (messages.length) {
            const transcriptLines = messages.map((m) => {
              const ts = m.createdAt.toISOString();
              const name = m.sender?.name || 'Unknown';
              return `[${ts}] ${name}: ${m.text}`;
            });
            transcriptText = transcriptLines.join('\\n');
          }
        }
      }
    } catch (e) {
      // ถ้าอ่าน transcript ไม่ได้ ให้ถือว่าไม่มี transcript แล้ว fallback ต่อ
      this.logger.warn(`Failed to load meeting transcript for ${meetingId}: ${e}`);
      transcriptText = '';
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2) โครงสร้างผลลัพธ์มาตรฐาน (ใช้ได้ทั้ง AI และ fallback)
    // ─────────────────────────────────────────────────────────────────────────────
    type ParsedSummary = {
      summary: string;
      decisions: string[];
      actionItems: {
        title: string;
        ownerName?: string;
        ownerEmail?: string;
        priority?: string;
        dueDateNote?: string;
      }[];
    };

    let parsed: ParsedSummary | null = null;
    let humanReadableAiSummary = '';
    let createdTasksCount = 0;

    // ─────────────────────────────────────────────────────────────────────────────
    // 3) ลองใช้ Gemini ถ้ามี API key + transcript ไม่ว่าง
    // ─────────────────────────────────────────────────────────────────────────────
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    if (hasGeminiKey && transcriptText) {
      try {
        const systemPrompt =
          'You are an assistant that summarizes internal company meetings in Thai language. ' +
          'Given a full chat transcript of a single meeting, you must produce: ' +
          '(1) a concise high-level summary in Thai, ' +
          '(2) clear bullet-point key decisions, ' +
          '(3) a list of actionable tasks with owner (name) and due date suggestion if possible. ' +
          'Return your answer as strict JSON only, with keys: "summary", "decisions", "actionItems". ' +
          '"decisions" is an array of strings (Thai). ' +
          '"actionItems" is an array of objects with fields: "title", "ownerName", "ownerEmail", "priority", "dueDateNote". ' +
          'Do not include any other keys or explanations.';

        const userPrompt = [
          `Meeting title: ${meeting.title}`,
          meeting.description ? `Description: ${meeting.description}` : '',
          `Host: ${meeting.host?.name || 'Unknown'} (${meeting.host?.email || ''})`,
          '',
          'Chat transcript:',
          transcriptText,
        ]
          .filter(Boolean)
          .join('\\n');

        const apiKey = process.env.GEMINI_API_KEY!;
        const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';
        const client = this.geminiClient ?? new GoogleGenerativeAI(apiKey);
        const model = client.getGenerativeModel({ model: modelName });

        const prompt = `${systemPrompt}\\n\\n[MEETING CONTEXT]\\n${userPrompt}`;
        const result = await model.generateContent(prompt);
        const rawText = result.response.text() || '';

        parsed = JSON.parse(rawText) as ParsedSummary;

        // สร้าง human-readable summary แบบเดิม
        const humanReadableAiSummaryParts: string[] = [];
        humanReadableAiSummaryParts.push('🔎 สรุปภาพรวมการประชุม');
        humanReadableAiSummaryParts.push(parsed.summary);
        humanReadableAiSummaryParts.push('\\n📌 หัวข้อ / ข้อสรุปสำคัญ');
        humanReadableAiSummaryParts.push(
          parsed.decisions.map((d, idx) => `${idx + 1}. ${d}`).join('\\n') || '-',
        );
        humanReadableAiSummaryParts.push('\\n✅ งานที่ต้องทำ (Action Items)');
        if (parsed.actionItems.length) {
          humanReadableAiSummaryParts.push(
            parsed.actionItems
              .map((a, idx) => {
                const who =
                  a.ownerName || a.ownerEmail
                    ? `${a.ownerName || ''}${a.ownerEmail ? ` (${a.ownerEmail})` : ''}`
                    : 'ไม่ระบุผู้รับผิดชอบ';
                const prio = a.priority ? a.priority.toUpperCase() : 'MEDIUM';
                const due = a.dueDateNote || 'ยังไม่กำหนดกำหนดส่ง';
                return `${idx + 1}. [${prio}] ${a.title}\\n   ผู้รับผิดชอบ: ${who}\\n   หมายเหตุเวลา: ${due}`;
              })
              .join('\\n'),
          );
        } else {
          humanReadableAiSummaryParts.push('- ไม่มีงานที่ต้องทำจาก AI');
        }

        humanReadableAiSummary = humanReadableAiSummaryParts.join('\\n');

        // สร้าง tasks จาก action items (เหมือนเดิม)
        const createdTasks: { id: string }[] = [];
        for (const item of parsed.actionItems) {
          const ownerEmail = item.ownerEmail?.toLowerCase().trim();
          let assignee: { id: string } | null = null;
          if (ownerEmail) {
            assignee = await this.prisma.user.findFirst({
              where: {
                email: ownerEmail,
                organizationId: meeting.host.organizationId,
              },
            });
          }

          const priority =
            item.priority && ['low', 'medium', 'high', 'urgent'].includes(item.priority)
              ? item.priority
              : 'medium';

          const task = await this.prisma.task.create({
            data: {
              title: item.title,
              description: item.dueDateNote
                ? `สร้างจาก AI Meeting Summary\\n\\nหมายเหตุเวลา: ${item.dueDateNote}`
                : 'สร้างจาก AI Meeting Summary',
              priority,
              status: 'todo',
              meetingId: meeting.id,
              teamId: meeting.teamId || undefined,
              assigneeId: assignee?.id,
              tags: ['ai-generated', 'meeting'],
            },
          });
          createdTasks.push({ id: task.id });
        }

        createdTasksCount = createdTasks.length;
      } catch (e: any) {
        this.logger.error(
          `Gemini error while generating meeting summary (meetingId=${meetingId}): ${e?.message || e}`,
        );
        // ถ้า AI ล้มเหลว ให้ fallback ด้านล่าง
        parsed = null;
        humanReadableAiSummary = '';
        createdTasksCount = 0;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4) Fallback แบบ rule‑based (ไม่พึ่ง AI เลย)
    // ─────────────────────────────────────────────────────────────────────────────
    if (!parsed) {
      const participantCount = meeting.participants.length;
      const taskCount = meeting.tasks.length;

      const durationMinutes =
        meeting.actualStartTime && meeting.actualEndTime
          ? Math.max(
              0,
              Math.round(
                (meeting.actualEndTime.getTime() - meeting.actualStartTime.getTime()) / 60000,
              ),
            )
          : undefined;

      const durationText = durationMinutes
        ? `${durationMinutes} นาที`
        : 'ยังไม่ทราบระยะเวลาที่แน่นอน';

      const dateText = meeting.startTime.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      const hostName = meeting.host?.name || 'ไม่ระบุ';

      const summaryLines: string[] = [];
      summaryLines.push(
        `การประชุม "${meeting.title}" จัดขึ้นในวันที่ ${dateText} โดยมี ${participantCount} คนเข้าร่วม และใช้เวลาประมาณ ${durationText}.`,
      );
      summaryLines.push(
        `ผู้จัดประชุมหลักคือ ${hostName}${meeting.team ? ` ในทีม ${meeting.team.name}` : ''}.`,
      );
      if (taskCount > 0) {
        summaryLines.push(
          `มีการสร้างงาน (tasks) ที่เชื่อมกับการประชุมนี้จำนวน ${taskCount} งาน ระบบจะแสดงรายการงานเหล่านี้ด้านล่าง.`,
        );
      } else {
        summaryLines.push(
          'ยังไม่พบงาน (tasks) ที่เชื่อมกับการประชุมนี้ คุณสามารถสร้างงานจากสรุปการประชุมได้เองภายหลัง.',
        );
      }

      parsed = {
        summary: summaryLines.join(' '),
        decisions: [],
        actionItems: meeting.tasks.map((t) => ({
          title: t.title,
          ownerName: undefined,
          ownerEmail: undefined,
          priority: t.priority || 'medium',
          dueDateNote: t.dueDate
            ? `กำหนดส่ง ${t.dueDate.toISOString().slice(0, 10)}`
            : 'ยังไม่กำหนดกำหนดส่ง',
        })),
      };

      const humanReadableParts: string[] = [];
      humanReadableParts.push('🔎 สรุปภาพรวมการประชุม (โหมดไม่ใช้ AI)');
      humanReadableParts.push(parsed.summary);
      humanReadableParts.push('\\n📌 หัวข้อ / ข้อสรุปสำคัญ');
      humanReadableParts.push('- ระบบยังไม่ได้วิเคราะห์ข้อสรุปอัตโนมัติ');
      humanReadableParts.push('\\n✅ งานที่ต้องทำ (Action Items จาก Tasks ที่มีอยู่แล้ว)');
      if (parsed.actionItems.length) {
        humanReadableParts.push(
          parsed.actionItems
            .map((a, idx) => {
              const prio = a.priority ? a.priority.toUpperCase() : 'MEDIUM';
              const due = a.dueDateNote || 'ยังไม่กำหนดกำหนดส่ง';
              return `${idx + 1}. [${prio}] ${a.title}\\n   หมายเหตุเวลา: ${due}`;
            })
            .join('\\n'),
        );
      } else {
        humanReadableParts.push('- ยังไม่มีงานที่เชื่อมกับการประชุมนี้');
      }

      humanReadableAiSummary = humanReadableParts.join('\\n');
      createdTasksCount = 0;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 5) บันทึกผลลัพธ์ลง Meeting และคืนค่ามาตรฐาน
    // ─────────────────────────────────────────────────────────────────────────────
    const updatedMeeting = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        aiSummary: JSON.stringify({
          ...parsed,
          generatedAt: new Date().toISOString(),
        }),
        transcript: transcriptText || meeting.transcript || null,
      },
      include: {
        tasks: true,
        participants: true,
        team: true,
        host: true,
      },
    });

    return {
      meeting: updatedMeeting,
      aiSummary: humanReadableAiSummary,
      raw: parsed,
      createdTasksCount,
    };
  }

  /**
   * Generate recurring meeting instances from a template
   */
  async generateRecurringInstances(templateId: string, upToDate?: Date) {
    const template = await this.prisma.meeting.findUnique({
      where: { id: templateId },
    });

    if (!template || !template.isRecurring || !template.recurringPattern) {
      throw new NotFoundException('Recurring meeting template not found');
    }

    const endDate = upToDate || template.recurringEndDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Default: 1 year ahead
    const instances: any[] = [];
    let currentDate = new Date(template.startTime);

    while (currentDate <= endDate) {
      // Check if instance already exists
      const existing = await this.prisma.meeting.findFirst({
        where: {
          parentMeetingId: templateId,
          startTime: currentDate,
        },
      });

      if (!existing) {
        const duration = template.endTime
          ? template.endTime.getTime() - template.startTime.getTime()
          : 60 * 60 * 1000; // Default 1 hour

        const instanceEndTime = new Date(currentDate.getTime() + duration);
        let meetingCode = this.generateMeetingCode();
        while (await this.prisma.meeting.findUnique({ where: { meetingCode } })) {
          meetingCode = this.generateMeetingCode();
        }

        const instance = await this.prisma.meeting.create({
          data: {
            title: template.title,
            description: template.description,
            startTime: currentDate,
            endTime: instanceEndTime,
            meetingCode,
            password: template.password,
            waitingRoom: template.waitingRoom,
            allowScreenShare: template.allowScreenShare,
            status: 'scheduled',
            teamId: template.teamId,
            hostId: template.hostId,
            isRecurring: false,
            parentMeetingId: templateId,
            recurringTemplateId: templateId,
          },
        });

        instances.push(instance);
        this.eventsGateway.emitMeetingCreated(instance);
      }

      // Calculate next occurrence
      currentDate = this.getNextRecurrenceDate(currentDate, template.recurringPattern, template.recurringDays || []);
    }

    this.logger.log(`Generated ${instances.length} recurring meeting instances for template ${templateId}`);
    return instances;
  }

  /**
   * Get the next recurrence date based on pattern
   */
  private getNextRecurrenceDate(currentDate: Date, pattern: string, days: number[]): Date {
    const next = new Date(currentDate);

    switch (pattern) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;

      case 'weekly':
        if (days.length > 0) {
          // Find next day in the days array
          const currentDay = next.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const sortedDays = [...days].sort((a, b) => a - b);
          const nextDay = sortedDays.find((d) => d > currentDay) || sortedDays[0];
          
          if (nextDay > currentDay) {
            next.setDate(next.getDate() + (nextDay - currentDay));
          } else {
            // Next week
            next.setDate(next.getDate() + (7 - currentDay + nextDay));
          }
        } else {
          next.setDate(next.getDate() + 7);
        }
        break;

      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;

      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;

      default:
        next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * Regenerate recurring instances (useful for extending or updating)
   */
  async regenerateRecurringInstances(templateId: string) {
    // Delete existing future instances
    const now = new Date();
    await this.prisma.meeting.deleteMany({
      where: {
        parentMeetingId: templateId,
        startTime: {
          gt: now,
        },
      },
    });

    // Regenerate
    return this.generateRecurringInstances(templateId);
  }
}
