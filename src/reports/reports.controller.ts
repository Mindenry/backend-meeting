import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Parser as Json2CsvParser } from 'json2csv';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
// @ts-ignore - Optional Swagger decorators
import {
  ApiTags,
  ApiBearerAuth,
} from '../common/decorators/swagger.decorators';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from '../common/audit.service';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly auditService: AuditService,
  ) {}

  private toDateOrThrow(value?: string, fieldName = 'date'): Date | undefined {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }
    return parsed;
  }

  private normalizeRange(range?: string) {
    const normalized = String(range || 'month').toLowerCase();
    const allowed = ['week', 'month', 'quarter', 'year'];
    if (!allowed.includes(normalized)) {
      throw new BadRequestException('range must be week, month, quarter, or year');
    }
    return normalized as 'week' | 'month' | 'quarter' | 'year';
  }

  private buildDateRange(range: 'week' | 'month' | 'quarter' | 'year') {
    const endDate = new Date();
    const startDate = new Date();

    switch (range) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  }

  @Get()
  async getUserReport(
    @Query('range') range: string = 'month',
    @Request() req: any,
  ) {
    const normalizedRange = this.normalizeRange(range);
    return this.reportsService.getOverviewReport(req.user, normalizedRange as any);
  }

  @Get('team-productivity')
  getTeamProductivityReport(
    @Query('teamId') teamId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) {
    if (!teamId) {
      throw new BadRequestException('teamId is required');
    }

    const parsedStartDate = this.toDateOrThrow(startDate, 'startDate');
    const parsedEndDate = this.toDateOrThrow(endDate, 'endDate');

    if (!parsedStartDate || !parsedEndDate) {
      throw new BadRequestException('startDate and endDate are required');
    }

    return this.reportsService.getTeamProductivityReport(
      teamId,
      parsedStartDate,
      parsedEndDate,
      req.user,
    );
  }

  @Get('user-activity')
  getUserActivityReport(
    @Query('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const parsedStartDate = this.toDateOrThrow(startDate, 'startDate');
    const parsedEndDate = this.toDateOrThrow(endDate, 'endDate');

    if (!parsedStartDate || !parsedEndDate) {
      throw new BadRequestException('startDate and endDate are required');
    }

    return this.reportsService.getUserActivityReport(
      userId,
      parsedStartDate,
      parsedEndDate,
      req.user,
    );
  }

  @Get('meeting-analytics')
  getMeetingAnalytics(@Query('meetingId') meetingId: string, @Request() req: any) {
    if (!meetingId) {
      throw new BadRequestException('meetingId is required');
    }
    return this.reportsService.getMeetingAnalytics(meetingId, req.user);
  }

  @Get('meetings')
  async getMeetingReport(
    @Query('organizationId') organizationId?: string,
    @Query('teamId') teamId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ) {
    return this.reportsService.getMeetingReport({
      organizationId,
      teamId,
      startDate: this.toDateOrThrow(startDate, 'startDate'),
      endDate: this.toDateOrThrow(endDate, 'endDate'),
      currentUser: req.user,
    });
  }

  @Get('tasks')
  async getTaskReport(
    @Query('organizationId') organizationId?: string,
    @Query('teamId') teamId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ) {
    return this.reportsService.getTaskReport({
      organizationId,
      teamId,
      assigneeId,
      startDate: this.toDateOrThrow(startDate, 'startDate'),
      endDate: this.toDateOrThrow(endDate, 'endDate'),
      currentUser: req.user,
    });
  }

  @Get('teams/:teamId/workload')
  async getTeamWorkloadReport(
    @Param('teamId') teamId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ) {
    return this.reportsService.getTeamWorkloadReport(
      teamId,
      this.toDateOrThrow(startDate, 'startDate'),
      this.toDateOrThrow(endDate, 'endDate'),
      req.user,
    );
  }

  @Get('performance')
  async getPerformanceDashboard(
    @Query('organizationId') organizationId?: string,
    @Query('teamId') teamId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ) {
    return this.reportsService.getPerformanceDashboard({
      organizationId,
      teamId,
      startDate: this.toDateOrThrow(startDate, 'startDate'),
      endDate: this.toDateOrThrow(endDate, 'endDate'),
      currentUser: req.user,
    });
  }

  private buildExportRows(type: string, reportData: any) {
    if (type === 'overview') {
      const rows: Record<string, any>[] = [
        {
          Section: 'Personal Summary',
          TasksCompleted: reportData.tasksCompleted ?? 0,
          MeetingsAttended: reportData.meetingsAttended ?? 0,
          MessagesSent: reportData.messagesSent ?? 0,
          ProductivityScore: reportData.productivityScore ?? 0,
        },
      ];

      if (Array.isArray(reportData.teamMetrics)) {
        reportData.teamMetrics.forEach((metric: any) => {
          rows.push({
            Section: 'Team Metrics',
            Team: metric.teamName,
            TasksCompleted: metric.tasksCompleted ?? 0,
            MeetingsAttended: metric.meetingsAttended ?? 0,
            MessagesSent: metric.messagesSent ?? 0,
          });
        });
      }

      return rows;
    }

    if (type === 'team') {
      const rows: Record<string, any>[] = [
        {
          Section: 'Team Summary',
          Team: reportData.team?.name,
          Members: reportData.summary?.members ?? 0,
          TasksTotal: reportData.summary?.tasks?.total ?? 0,
          TasksCompleted: reportData.summary?.tasks?.completed ?? 0,
          TasksInProgress: reportData.summary?.tasks?.inProgress ?? 0,
          MeetingsTotal: reportData.summary?.meetings?.total ?? 0,
        },
      ];

      if (Array.isArray(reportData.members)) {
        reportData.members.forEach((member: any) => {
          rows.push({
            Section: 'Member Detail',
            Name: member.user?.name,
            Email: member.user?.email,
            TasksTotal: member.tasks?.total ?? 0,
            TasksCompleted: member.tasks?.completed ?? 0,
            TasksInProgress: member.tasks?.inProgress ?? 0,
            MessagesSent: member.messagesSent ?? 0,
            MeetingsAttended: member.meetingsAttended ?? 0,
          });
        });
      }

      return rows;
    }

    if (type === 'performance') {
      const rows: Record<string, any>[] = [];

      if (Array.isArray(reportData.taskCompletionRates)) {
        reportData.taskCompletionRates.forEach((row: any) => {
          rows.push({
            Section: 'Task Completion',
            Name: row.userName,
            TasksTotal: row.totalTasks,
            TasksCompleted: row.completedTasks,
            CompletionRate: row.completionRate,
          });
        });
      }

      if (Array.isArray(reportData.collaborationActivity)) {
        reportData.collaborationActivity.forEach((row: any) => {
          rows.push({
            Section: 'Collaboration Activity',
            Name: row.userName,
            TasksCompleted: row.completedTasks,
            MeetingsAttended: row.attendedMeetings,
            MessagesSent: row.messagesSent,
            TotalInteractions: row.totalInteractions,
          });
        });
      }

      if (Array.isArray(reportData.meetingAttendanceRates)) {
        reportData.meetingAttendanceRates.forEach((row: any) => {
          rows.push({
            Section: 'Meeting Attendance',
            Name: row.userName,
            MeetingsTotal: row.totalMeetings,
            MeetingsAttended: row.attendedMeetings,
            AttendanceRate: row.attendanceRate,
          });
        });
      }

      return rows;
    }

    return [];
  }

  @Get('export')
  async exportReport(
    @Query('type') type: string,
    @Query('range') range: string,
    @Query('teamId') teamId: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('format') format: string,
    @Request() req: any,
    @Res() res: any,
  ) {
    const normalizedType = String(type || '').toLowerCase();
    const normalizedFormat = String(format || '').toLowerCase();

    const allowedTypes = ['overview', 'team', 'performance'];
    const allowedFormats = ['csv', 'xlsx', 'json', 'pdf'];

    if (!allowedTypes.includes(normalizedType)) {
      throw new BadRequestException('type must be overview, team, or performance');
    }
    if (!allowedFormats.includes(normalizedFormat)) {
      throw new BadRequestException('format must be csv, xlsx, json, or pdf');
    }

    if (normalizedType === 'team' && !teamId) {
      throw new BadRequestException('teamId is required for team report');
    }

    const resolvedStartDate = this.toDateOrThrow(startDate, 'startDate');
    const resolvedEndDate = this.toDateOrThrow(endDate, 'endDate');

    const rangeValue = (range || 'month') as any;

    let reportData: any = null;
    let filename = 'report';

    if (normalizedType === 'overview') {
      reportData = await this.reportsService.getOverviewReport(req.user, rangeValue);
      filename = `overview_report_${rangeValue}`;
    } else if (normalizedType === 'team') {
      if (!resolvedStartDate || !resolvedEndDate) {
        throw new BadRequestException('startDate and endDate are required for team report');
      }
      reportData = await this.reportsService.getTeamProductivityReport(
        teamId as string,
        resolvedStartDate,
        resolvedEndDate,
        req.user,
      );
      filename = `team_report_${teamId}`;
    } else if (normalizedType === 'performance') {
      reportData = await this.reportsService.getPerformanceDashboard({
        teamId,
        startDate: resolvedStartDate,
        endDate: resolvedEndDate,
        currentUser: req.user,
      });
      filename = `performance_report_${rangeValue}`;
    }

    if (!reportData) {
      throw new BadRequestException('No report data');
    }

    const exportRows = this.buildExportRows(normalizedType, reportData);
    const safeFilename = `${filename}_${new Date().toISOString().slice(0, 10)}`;

    await this.auditService.log({
      action: 'export',
      entity: 'report',
      entityId: normalizedType,
      userId: req.user?.id,
      userName: req.user?.name,
      details: {
        type: normalizedType,
        format: normalizedFormat,
        range: rangeValue,
        teamId,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (normalizedFormat === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.json"`);
      return res.status(200).send({
        type: normalizedType,
        generatedAt: new Date().toISOString(),
        data: reportData,
      });
    }

    if (normalizedFormat === 'csv') {
      const parser = new Json2CsvParser();
      const csv = parser.parse(exportRows.length > 0 ? exportRows : [{}]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.csv"`);
      return res.status(200).send(csv);
    }

    if (normalizedFormat === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Report');
      const rows = exportRows.length > 0 ? exportRows : [{}];

      const headers = Object.keys(rows[0]);
      sheet.addRow(headers);
      rows.forEach((row) => {
        sheet.addRow(headers.map((h) => row[h]));
      });

      sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach((col) => {
        col.width = Math.max(12, ...(col.values as any[]).map((v) => `${v ?? ''}`.length));
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.xlsx"`);

      await workbook.xlsx.write(res);
      return res.end();
    }

    if (normalizedFormat === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.pdf"`);

      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      doc.pipe(res);
      doc.fontSize(16).text('Team Connect Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Type: ${normalizedType}`);
      doc.text(`Generated: ${new Date().toLocaleString()}`);
      doc.moveDown();

      const rows = exportRows.length > 0 ? exportRows : [{}];
      const headers = Object.keys(rows[0]);

      doc.fontSize(10).text(headers.join(' | '));
      doc.moveDown(0.3);
      rows.forEach((row) => {
        const line = headers.map((h) => `${row[h] ?? ''}`).join(' | ');
        doc.text(line);
      });

      doc.end();
      return;
    }

    throw new BadRequestException('Unsupported export format');
  }

  @Post('work-hours')
  async createWorkHours(
    @Body()
    data: {
      userId: string;
      date: string;
      hours: number;
      notes?: string;
      teamId?: string;
    },
    @Request() req: any,
  ) {
    if (!data.userId) {
      throw new BadRequestException('userId is required');
    }

    const parsedDate = this.toDateOrThrow(data.date, 'date');
    if (!parsedDate) {
      throw new BadRequestException('date is required');
    }

    return this.reportsService.createWorkHours(
      {
        ...data,
        date: parsedDate,
      },
      req.user,
    );
  }
}
