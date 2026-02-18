import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

type CopilotIntent =
  | 'MEETING_SUMMARY_TODAY'
  | 'TASK_OVERDUE'
  | 'TASK_OVERVIEW'
  | 'DOCS_SEARCH'
  | 'GENERIC';

@Injectable()
export class CopilotService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(CopilotService.name);
  private geminiResolvedModelName: string | null = null;
  private geminiResolvedAtMs = 0;

  private geminiClient = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

  private ensureAiProviderConfigured() {
    if (!this.geminiClient) {
      throw new InternalServerErrorException(
        'Gemini API key is not configured. Please set GEMINI_API_KEY in backend .env file.',
      );
    }
  }

  private detectIntent(question: string): CopilotIntent {
    const lower = question.toLowerCase();

    // Docs / wiki / knowledge
    const isDocs =
      lower.includes('wiki') ||
      lower.includes('เอกสาร') ||
      lower.includes('คู่มือ') ||
      lower.includes('policy') ||
      lower.includes('manual') ||
      lower.includes('spec') ||
      lower.includes('document') ||
      lower.includes('docs');
    if (isDocs) return 'DOCS_SEARCH';

    // Simple heuristic for Thai/English phrasing around today's meetings
    const isTodayMeeting =
      (lower.includes('meeting') || lower.includes('ประชุม')) &&
      (lower.includes('วันนี้') ||
        lower.includes('today') ||
        lower.includes('วันนี้มีอะไร') ||
        lower.includes('สรุป'));
    if (isTodayMeeting) return 'MEETING_SUMMARY_TODAY';

    // Overdue tasks
    const isOverdueTask =
      lower.includes('overdue') ||
      lower.includes('เลยกำหนด') ||
      lower.includes('เกินกำหนด') ||
      lower.includes('ยังไม่เสร็จ') ||
      (lower.includes('task') && (lower.includes('ค้าง') || lower.includes('pending'))) ||
      (lower.includes('งาน') && lower.includes('เลยกำหนด'));
    if (isOverdueTask) return 'TASK_OVERDUE';

    // Generic task overview (not only overdue)
    const isTaskOverview =
      lower.includes('task') ||
      lower.includes('งาน') ||
      lower.includes('to-do') ||
      lower.includes('todo');
    if (isTaskOverview) return 'TASK_OVERVIEW';

    return 'GENERIC';
  }

  async ask(params: { question: string; userId?: string; teamId?: string }) {
    this.ensureAiProviderConfigured();

    const { question, userId, teamId } = params;
    const intent = this.detectIntent(question);

    if (intent === 'MEETING_SUMMARY_TODAY') {
      return this.handleTodayMeetings(question, userId, teamId);
    }

    if (intent === 'TASK_OVERDUE') {
      return this.handleOverdueTasks(question, userId, teamId);
    }

    if (intent === 'TASK_OVERVIEW') {
      return this.handleTasksOverview(question, userId, teamId);
    }

    if (intent === 'DOCS_SEARCH') {
      return this.handleDocsSearch(question, teamId);
    }

    return this.handleGeneric(question);
  }

  /**
   * Use Gemini (required) as the only AI provider.
   * Always returns plain text or a friendly error message from the system itself.
   */
  private async generateTextWithAi(systemPrompt: string, userContent: string): Promise<string> {
    // Use Gemini (required)
    if (this.geminiClient) {
      try {
        const modelName = await this.resolveGeminiModelName();
        const model = this.geminiClient.getGenerativeModel({ model: modelName });

        // Concatenate system + user into a single prompt for simplicity
        const prompt = `${systemPrompt}\n\n[USER CONTEXT]\n${userContent}`;
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text) {
          return text;
        }
      } catch (err: any) {
        const status = err?.status;
        const statusText = err?.statusText;
        this.logger.error(
          `Gemini error (status=${status}, statusText=${statusText}) – will fall back to friendly message`,
        );
        return (
          'AI Copilot พยายามเรียกใช้ Gemini API แต่ไม่สำเร็จ (อาจเป็นเพราะชื่อโมเดลไม่รองรับ หรือสิทธิ์การใช้งานยังไม่เปิด) ' +
          'กรุณาตรวจสอบค่า GEMINI_API_KEY ในไฟล์ .env ของ backend-meeting หรือใช้ OpenAI แทน แล้วลองใหม่อีกครั้งค่ะ'
        );
      }
    }

    // ถ้ามาถึงตรงนี้แปลว่าเรียกทั้ง OpenAI และ Gemini ไม่สำเร็จ
    return (
      'AI Copilot ไม่สามารถเชื่อมต่อผู้ให้บริการโมเดล (ทั้ง OpenAI และ Gemini) ได้ในตอนนี้ ' +
      'กรุณาตรวจสอบค่า OPENAI_API_KEY / GEMINI_API_KEY และโมเดลที่ใช้ จากนั้นลองใหม่อีกครั้งค่ะ'
    );
  }

  /**
   * Resolve a working Gemini model name automatically.
   * - If GEMINI_MODEL is set, use it directly.
   * - Otherwise call Gemini ListModels API, pick a model that supports generateContent.
   * - Cache the result for a while to avoid calling ListModels on every request.
   */
  private async resolveGeminiModelName(): Promise<string> {
    const forced = process.env.GEMINI_MODEL?.trim();
    if (forced) return forced;

    const cacheTtlMs = 60 * 60 * 1000; // 1 hour
    const now = Date.now();
    if (this.geminiResolvedModelName && now - this.geminiResolvedAtMs < cacheTtlMs) {
      return this.geminiResolvedModelName;
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      // Should not happen when geminiClient exists, but keep safe
      return 'gemini-1.5-flash-latest';
    }

    type ListModelsResponse = {
      models?: Array<{
        name?: string; // e.g. "models/gemini-1.5-flash-latest"
        supportedGenerationMethods?: string[]; // e.g. ["generateContent", ...]
      }>;
    };

    let json: ListModelsResponse | null = null;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(`Gemini ListModels failed: ${res.status} ${res.statusText} ${text}`);
      } else {
        json = (await res.json()) as ListModelsResponse;
      }
    } catch (e: any) {
      this.logger.warn(`Gemini ListModels request failed: ${e?.message || String(e)}`);
    }

    const supported = (json?.models || [])
      .map((m) => ({
        name: m.name || '',
        methods: m.supportedGenerationMethods || [],
      }))
      .filter((m) => m.name && m.methods.includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .filter((name) => name.toLowerCase().includes('gemini'));

    const preferredOrder = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro-latest',
      'gemini-1.5-pro',
    ];

    const picked =
      preferredOrder.find((p) => supported.includes(p)) ||
      supported[0] ||
      // last resort default (may fail, but better than empty)
      'gemini-1.5-flash-latest';

    this.geminiResolvedModelName = picked;
    this.geminiResolvedAtMs = now;
    this.logger.log(`Gemini model auto-selected: ${picked}`);
    return picked;
  }

  private async handleTodayMeetings(question: string, userId?: string, teamId?: string) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const where: any = {
      startTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    if (teamId) {
      where.teamId = teamId;
    }

    if (userId) {
      // Hosted or participant
      where.OR = [
        { hostId: userId },
        {
          participants: {
            some: {
              userId,
            },
          },
        },
      ];
    }

    const meetings = await this.prisma.meeting.findMany({
      where,
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
              },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
      take: 20,
    });

    if (!meetings.length) {
      return {
        intent: 'MEETING_SUMMARY_TODAY',
        answer: 'วันนี้ยังไม่มี meeting ที่เกี่ยวข้องในระบบ หรือยังไม่ได้ถูกสร้างไว้ใน Team Connect ค่ะ',
        raw: { meetingsCount: 0 },
      };
    }

    const context = {
      question,
      date: now.toISOString(),
      meetings: meetings.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        startTime: m.startTime,
        endTime: m.endTime,
        status: m.status,
        team: m.team ? { id: m.team.id, name: m.team.name } : null,
        host: m.host ? { id: m.host.id, name: m.host.name, email: m.host.email } : null,
        participants: m.participants.map((p) => ({
          id: p.user.id,
          name: p.user.name,
          email: p.user.email,
        })),
        tasks: m.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
        })),
      })),
    };

    const systemPrompt =
      'คุณคือ AI Copilot สำหรับองค์กร ทำงานบนระบบ Team Connect ' +
      'ให้สรุปรายการ meeting ของวันนี้ (ตาม timezone server) เป็นภาษาไทยแบบกระชับ อ่านง่าย เหมือนเล่าให้เพื่อนร่วมงานฟัง ' +
      'รูปแบบที่ต้องการ:\n' +
      '1) สรุปภาพรวมวันนี้มี meeting กี่อัน สำคัญอะไรบ้าง\n' +
      '2) แยกรายการเป็น bullet list: เวลา, ชื่อ meeting, ทีม, host, สถานะ (scheduled/live/ended)\n' +
      '3) ถ้ามี task ที่ผูกกับ meeting ให้สรุปคร่าว ๆ ต่อท้ายแต่ละ meeting ว่ามีงานอะไรสำคัญ\n' +
      'ห้ามแต่งข้อมูลที่ไม่มีใน context และห้ามพูดถึง JSON หรือโครงสร้างข้อมูล ให้ตอบเป็น plain text ภาษาไทยอย่างเดียว';

    const text = await this.generateTextWithAi(systemPrompt, JSON.stringify(context));

    return {
      intent: 'MEETING_SUMMARY_TODAY',
      answer: text || 'สรุปข้อมูล meeting วันนี้ไม่สำเร็จ กรุณาลองใหม่อีกครั้งค่ะ',
      raw: { meetingsCount: meetings.length },
    };
  }

  private async handleOverdueTasks(question: string, userId?: string, teamId?: string) {
    const now = new Date();

    const where: any = {
      dueDate: {
        lt: now,
      },
      status: {
        not: 'done',
      },
    };

    if (teamId) {
      where.teamId = teamId;
    }

    if (userId) {
      where.assigneeId = userId;
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        assignee: true,
        team: true,
      },
      orderBy: { dueDate: 'asc' },
      take: 50,
    });

    if (!tasks.length) {
      return {
        intent: 'TASK_OVERDUE',
        answer: 'ตอนนี้ยังไม่มี task ที่ overdue ในระบบ (หรือทุกงานถูกปิดแล้ว) 🎉',
        raw: { tasksCount: 0 },
      };
    }

    const context = {
      question,
      generatedAt: now.toISOString(),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        team: t.team ? { id: t.team.id, name: t.team.name } : null,
        assignee: t.assignee
          ? { id: t.assignee.id, name: t.assignee.name, email: t.assignee.email }
          : null,
      })),
    };

    const systemPrompt =
      'คุณคือ AI Copilot สำหรับระบบ task management ภายในองค์กร ' +
      'ให้สรุป task ที่ overdue จาก context เป็นภาษาไทย สั้น กระชับ ชัดเจน ' +
      'รูปแบบที่ต้องการ:\n' +
      '- เปิดด้วยสรุปภาพรวมว่ามี overdue กี่งาน แบ่งตาม priority คร่าว ๆ\n' +
      '- ทำ bullet รายการงาน: [PRIORITY] ชื่องาน – ผู้รับผิดชอบ – ทีม – dueDate (ระบุว่าเลยมากี่วัน)\n' +
      '- ปิดท้ายด้วยคำแนะนำสั้น ๆ ว่าควรโฟกัสงานไหนก่อน\n' +
      'ห้ามแต่งข้อมูลเพิ่มจากที่ให้ไป และตอบเป็น plain text ภาษาไทยเท่านั้น';

    const text = await this.generateTextWithAi(systemPrompt, JSON.stringify(context));

    return {
      intent: 'TASK_OVERDUE',
      answer: text || 'สรุป task ที่ overdue ไม่สำเร็จ กรุณาลองใหม่อีกครั้งค่ะ',
      raw: { tasksCount: tasks.length },
    };
  }

  /**
   * Overview of tasks for the user/team (not only overdue).
   * Supports natural questions like:
   * - "ตอนนี้ task ที่ฉันต้องทำมีอะไรบ้าง"
   * - "งานของทีมนี้ status เป็นยังไงบ้าง"
   */
  private async handleTasksOverview(question: string, userId?: string, teamId?: string) {
    const lower = question.toLowerCase();

    const where: any = {};

    if (teamId) {
      where.teamId = teamId;
    }

    if (userId) {
      where.assigneeId = userId;
    }

    // Optional status filtering based on wording
    const wantDone =
      lower.includes('เสร็จแล้ว') ||
      lower.includes('ปิดแล้ว') ||
      lower.includes('done') ||
      lower.includes('เรียบร้อย');
    const wantInProgress =
      lower.includes('กำลังทำ') ||
      lower.includes('doing') ||
      lower.includes('in progress');
    const wantTodo =
      lower.includes('ยังไม่เริ่ม') ||
      lower.includes('ค้าง') ||
      lower.includes('รอดำเนินการ') ||
      lower.includes('pending') ||
      lower.includes('todo');

    const statuses: string[] = [];
    if (wantTodo) statuses.push('todo');
    if (wantInProgress) statuses.push('in_progress');
    if (wantDone) statuses.push('done');

    if (statuses.length) {
      where.status = { in: statuses };
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        assignee: true,
        team: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (!tasks.length) {
      return {
        intent: 'TASK_OVERVIEW',
        answer:
          'ตอนนี้ไม่พบบันทึกงาน (task) ที่ตรงกับเงื่อนไขของคุณในระบบ อาจยังไม่มีการสร้างงานหรือเงื่อนไขแคบเกินไปค่ะ',
        raw: { tasksCount: 0 },
      };
    }

    const context = {
      question,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        team: t.team ? { id: t.team.id, name: t.team.name } : null,
        assignee: t.assignee
          ? { id: t.assignee.id, name: t.assignee.name, email: t.assignee.email }
          : null,
      })),
    };

    const systemPrompt =
      'คุณคือ AI Copilot สำหรับงาน task management ในระบบ Team Connect ' +
      'จาก context ที่ให้มา ให้สรุปรวมภาพรวมงาน (ทุกสถานะที่ได้รับ) เป็นภาษาไทย ' +
      'รูปแบบที่ต้องการ:\n' +
      '1) สรุปภาพรวมจำนวนงาน แบ่งตาม status (todo, in_progress, review, done) และ priority โดยประมาณ\n' +
      '2) bullet list งานสำคัญ 5–15 งานแรกที่ควรโฟกัส โดยเรียงจากความสำคัญสูงหรืองานใกล้ due ก่อน\n' +
      '   โดยแต่ละบรรทัดมี: [STATUS / PRIORITY] ชื่องาน – ผู้รับผิดชอบ – ทีม (ถ้ามี) – due (ถ้ามี)\n' +
      '3) ปิดท้ายด้วยข้อเสนอแนะสั้น ๆ ว่าควรจัดลำดับงานอย่างไร\n' +
      'ห้ามแต่งข้อมูลนอกเหนือ context และตอบเป็น plain text ภาษาไทยเท่านั้น';

    const text = await this.generateTextWithAi(systemPrompt, JSON.stringify(context));

    return {
      intent: 'TASK_OVERVIEW',
      answer: text || 'สรุปภาพรวมงาน (tasks) ไม่สำเร็จ กรุณาลองใหม่อีกครั้งค่ะ',
      raw: { tasksCount: tasks.length },
    };
  }

  private async handleGeneric(question: string) {
    const systemPrompt =
      'คุณคือ AI Copilot ภายในองค์กรสำหรับระบบ Team Connect ' +
      'ช่วยตอบคำถามทั่วไป สรุปข้อความ หรือช่วยเขียน message ให้สั้น กระชับ ตรงประเด็น ' +
      'ใช้ภาษาไทยแบบกันเองในที่ทำงาน แต่ยังสุภาพ และห้ามอ้างว่าคุณเข้าถึงข้อมูลนอกเหนือจากที่ผู้ใช้ให้มาในคำถาม';

    const text = await this.generateTextWithAi(systemPrompt, question);

    return {
      intent: 'GENERIC' as CopilotIntent,
      answer: text || 'ไม่สามารถตอบคำถามได้ในตอนนี้ กรุณาลองใหม่อีกครั้งค่ะ',
      raw: {},
    };
  }

  /**
   * Search for relevant internal documents (wiki/docs) using Shared Drive metadata.
   * Currently uses DriveEntry name/path as a lightweight "wiki/docs" source.
   */
  private async handleDocsSearch(question: string, teamId?: string) {
    const keyword = question.trim();

    const where: any = {
      OR: [
        {
          name: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
        {
          path: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
      ],
    };

    if (teamId) {
      where.teamId = teamId;
    }

    const entries = await this.prisma.driveEntry.findMany({
      where,
      include: {
        team: true,
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
      take: 50,
    });

    if (!entries.length) {
      return {
        intent: 'DOCS_SEARCH',
        answer:
          'ไม่พบเอกสารหรือไฟล์ที่ตรงกับคำค้นหาของคุณใน Shared Drive ของทีมนี้ ลองใช้คำค้นที่สั้นลงหรือทั่วไปมากขึ้นดูนะคะ',
        raw: { docsCount: 0 },
      };
    }

    const context = {
      question,
      docs: entries.map((e) => ({
        id: e.id,
        name: e.name,
        path: e.path,
        isFolder: e.isFolder,
        team: e.team ? { id: e.team.id, name: e.team.name } : null,
        latestVersion: e.versions[0]
          ? {
              version: e.versions[0].version,
              mimeType: e.versions[0].mimeType,
              size: e.versions[0].size,
            }
          : null,
      })),
    };

    const systemPrompt =
      'คุณคือ AI Copilot สำหรับช่วยค้นหาและสรุปเอกสารภายในองค์กรจาก Shared Drive ' +
      'จาก context ที่ให้มา (มีเพียง metadata ของไฟล์/โฟลเดอร์) ให้คุณ:\n' +
      '1) สรุปเป็นภาษาไทยว่าเจอเอกสาร/โฟลเดอร์แบบไหนบ้างที่น่าจะเกี่ยวข้องกับคำถาม\n' +
      '2) แสดง bullet list ของผลลัพธ์สำคัญ (5–15 รายการ): ชื่อไฟล์/โฟลเดอร์ – path ย่อ – ทีม\n' +
      '3) แนะนำว่าควรเปิดดูไฟล์ไหนก่อน โดยอ้างอิงจากชื่อไฟล์และ path เท่านั้น (ห้ามแต่งเนื้อหาภายในไฟล์เอง)\n' +
      'คุณไม่มีสิทธิ์อ่านเนื้อหาในไฟล์จริง ๆ ดังนั้นห้ามเดาเนื้อหา ให้พูดแค่ว่า “จากชื่อไฟล์/path น่าจะเกี่ยวกับ ...” เท่านั้น';

    const text = await this.generateTextWithAi(systemPrompt, JSON.stringify(context));

    return {
      intent: 'DOCS_SEARCH',
      answer:
        text ||
        'ไม่สามารถสรุปผลการค้นหาเอกสารได้ในตอนนี้ แต่ระบบได้พบเอกสารบางส่วนที่เกี่ยวข้องใน Shared Drive แล้วค่ะ',
      raw: { docsCount: entries.length },
    };
  }
}

