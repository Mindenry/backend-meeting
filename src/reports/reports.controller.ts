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
import * as path from 'path';
import * as fs from 'fs';
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

  /**
   * Check if text contains Thai characters
   */
  private containsThai(text: string): boolean {
    if (!text) return false;
    // Thai Unicode range: U+0E00 to U+0E7F
    const thaiRegex = /[\u0E00-\u0E7F]/;
    return thaiRegex.test(text);
  }

  /**
   * Get appropriate font based on text content
   */
  private getFontForText(text: string, hasThaiFont: boolean): string {
    if (hasThaiFont && this.containsThai(text)) {
      return 'Thai';
    }
    return 'Helvetica';
  }

  /**
   * Get appropriate bold font based on text content
   */
  private getBoldFontForText(text: string, hasThaiFont: boolean): string {
    if (hasThaiFont && this.containsThai(text)) {
      return 'Thai'; // THSarabunNew doesn't have bold variant, use regular with larger size
    }
    return 'Helvetica-Bold';
  }

  private toDateOrThrow(value?: string, fieldName = 'date'): Date | undefined {
    if (!value) return undefined;
    // Handle URL-encoded ISO strings
    const decoded = decodeURIComponent(value);
    const parsed = new Date(decoded);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid ${fieldName}: ${decoded}`);
    }
    return parsed;
  }

  private normalizeRange(range?: string) {
    const normalized = String(range || 'month').toLowerCase();
    const allowed = ['week', 'month', 'quarter', 'year'];
    if (!allowed.includes(normalized)) {
      throw new BadRequestException(
        'range must be week, month, quarter, or year',
      );
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
    return this.reportsService.getOverviewReport(
      req.user,
      normalizedRange as any,
    );
  }

  @Get('overview')
  async getOverviewDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('teamId') teamId?: string,
    @Query('range') range?: string,
    @Request() req?: any,
  ) {
    const normalizedRange = this.normalizeRange(range);
    const { startDate: resolvedStart, endDate: resolvedEnd } =
      startDate || endDate
        ? {
            startDate: this.toDateOrThrow(startDate, 'startDate'),
            endDate: this.toDateOrThrow(endDate, 'endDate'),
          }
        : this.buildDateRange(normalizedRange);

    return this.reportsService.getOverviewReport(
      req.user,
      normalizedRange as any,
    );
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
  getMeetingAnalytics(
    @Query('meetingId') meetingId: string,
    @Request() req: any,
  ) {
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

  private buildExportRows(type: string, reportData: any, currentUser?: any) {
    // Build comprehensive export data with user details
    const timestamp = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (type === 'overview') {
      const rows: Record<string, any>[] = [];

      // Report Header
      rows.push({
        Section: '═══════════════════════════════════════',
        Field: 'PERSONAL PRODUCTIVITY REPORT',
        Value: '═══════════════════════════════════════',
      });

      rows.push({
        Section: 'Report Information',
        Field: 'Generated By',
        Value: currentUser?.name || 'System',
      });
      rows.push({
        Section: 'Report Information',
        Field: 'Generated Date',
        Value: `${timestamp} at ${timeStr}`,
      });
      rows.push({
        Section: 'Report Information',
        Field: 'Report Period',
        Value: reportData.period || 'Monthly',
      });

      // Executive Summary
      rows.push({
        Section: '─── Executive Summary ───',
        Field: '',
        Value: '',
      });
      const score = reportData.productivityScore ?? 0;
      const performance =
        score >= 80
          ? 'Excellent'
          : score >= 60
            ? 'Good'
            : score >= 40
              ? 'Average'
              : 'Needs Improvement';
      rows.push({
        Section: 'Performance Rating',
        Field: 'Overall Score',
        Value: `${score.toFixed(1)}% (${performance})`,
      });
      rows.push({
        Section: 'Performance Rating',
        Field: 'Tasks Completed',
        Value: reportData.tasksCompleted ?? 0,
      });
      rows.push({
        Section: 'Performance Rating',
        Field: 'Meetings Attended',
        Value: reportData.meetingsAttended ?? 0,
      });
      rows.push({
        Section: 'Performance Rating',
        Field: 'Messages Sent',
        Value: reportData.messagesSent ?? 0,
      });

      // Team Contributions
      if (
        Array.isArray(reportData.teamMetrics) &&
        reportData.teamMetrics.length > 0
      ) {
        rows.push({
          Section: '─── Team Contributions ───',
          Field: '',
          Value: '',
        });
        reportData.teamMetrics.forEach((metric: any, idx: number) => {
          rows.push({
            Section: `Team #${idx + 1}`,
            Field: 'Team Name',
            Value: metric.teamName,
          });
          rows.push({
            Section: `Team #${idx + 1}`,
            Field: 'Tasks Completed',
            Value: metric.tasksCompleted ?? 0,
          });
          rows.push({
            Section: `Team #${idx + 1}`,
            Field: 'Meetings Attended',
            Value: metric.meetingsAttended ?? 0,
          });
          rows.push({
            Section: `Team #${idx + 1}`,
            Field: 'Messages Sent',
            Value: metric.messagesSent ?? 0,
          });
        });
      }

      return rows;
    }

    if (type === 'team') {
      const rows: Record<string, any>[] = [];

      // Report Header
      rows.push({
        Section: '═══════════════════════════════════════',
        Field: 'TEAM PRODUCTIVITY REPORT',
        Value: '═══════════════════════════════════════',
      });

      rows.push({
        Section: 'Report Information',
        Field: 'Team Name',
        Value: reportData.team?.name || 'Unknown Team',
      });
      rows.push({
        Section: 'Report Information',
        Field: 'Generated By',
        Value: currentUser?.name || 'System',
      });
      rows.push({
        Section: 'Report Information',
        Field: 'Generated Date',
        Value: `${timestamp} at ${timeStr}`,
      });
      rows.push({
        Section: 'Report Information',
        Field: 'Report Period',
        Value: `${reportData.period?.start ? new Date(reportData.period.start).toLocaleDateString() : 'N/A'} - ${reportData.period?.end ? new Date(reportData.period.end).toLocaleDateString() : 'N/A'}`,
      });

      // Team Overview
      rows.push({
        Section: '─── Team Overview ───',
        Field: '',
        Value: '',
      });
      rows.push({
        Section: 'Team Statistics',
        Field: 'Total Members',
        Value: reportData.summary?.members ?? 0,
      });
      rows.push({
        Section: 'Team Statistics',
        Field: 'Total Tasks',
        Value: reportData.summary?.tasks?.total ?? 0,
      });
      rows.push({
        Section: 'Team Statistics',
        Field: 'Completed Tasks',
        Value: reportData.summary?.tasks?.completed ?? 0,
      });
      const completionRate =
        (reportData.summary?.tasks?.total ?? 0) > 0
          ? (
              ((reportData.summary?.tasks?.completed ?? 0) /
                (reportData.summary?.tasks?.total ?? 1)) *
              100
            ).toFixed(1)
          : '0';
      rows.push({
        Section: 'Team Statistics',
        Field: 'Completion Rate',
        Value: `${completionRate}%`,
      });
      rows.push({
        Section: 'Team Statistics',
        Field: 'In Progress Tasks',
        Value: reportData.summary?.tasks?.inProgress ?? 0,
      });
      rows.push({
        Section: 'Team Statistics',
        Field: 'Total Meetings',
        Value: reportData.summary?.meetings?.total ?? 0,
      });

      // Member Performance Details
      if (Array.isArray(reportData.members) && reportData.members.length > 0) {
        rows.push({
          Section: '─── Member Performance Details ───',
          Field: '',
          Value: '',
        });

        // Sort members by productivity
        const sortedMembers = [...reportData.members].sort(
          (a, b) => (b.tasks?.completed ?? 0) - (a.tasks?.completed ?? 0),
        );

        sortedMembers.forEach((member: any, idx: number) => {
          const memberName = member.user?.name || 'Unknown';
          const memberEmail = member.user?.email || 'N/A';

          rows.push({
            Section: `Member #${idx + 1}`,
            Field: 'Name',
            Value: memberName,
          });
          rows.push({
            Section: `Member #${idx + 1}`,
            Field: 'Email',
            Value: memberEmail,
          });
          rows.push({
            Section: `Member #${idx + 1}`,
            Field: 'Total Tasks',
            Value: member.tasks?.total ?? 0,
          });
          rows.push({
            Section: `Member #${idx + 1}`,
            Field: 'Completed',
            Value: member.tasks?.completed ?? 0,
          });
          rows.push({
            Section: `Member #${idx + 1}`,
            Field: 'In Progress',
            Value: member.tasks?.inProgress ?? 0,
          });
          rows.push({
            Section: `Member #${idx + 1}`,
            Field: 'Messages Sent',
            Value: member.messagesSent ?? 0,
          });
          rows.push({
            Section: `Member #${idx + 1}`,
            Field: 'Meetings Attended',
            Value: member.meetingsAttended ?? 0,
          });
          const memberRate =
            (member.tasks?.total ?? 0) > 0
              ? (
                  ((member.tasks?.completed ?? 0) /
                    (member.tasks?.total ?? 1)) *
                  100
                ).toFixed(1)
              : '0';
          rows.push({
            Section: `Member #${idx + 1}`,
            Field: 'Completion Rate',
            Value: `${memberRate}%`,
          });
        });

        // Top Performer
        const topPerformer = sortedMembers[0];
        rows.push({
          Section: '─── Recognition ───',
          Field: '',
          Value: '',
        });
        rows.push({
          Section: 'Top Performer',
          Field: 'Name',
          Value: topPerformer?.user?.name || 'N/A',
        });
        rows.push({
          Section: 'Top Performer',
          Field: 'Tasks Completed',
          Value: topPerformer?.tasks?.completed ?? 0,
        });
      }

      return rows;
    }

    if (type === 'performance') {
      const rows: Record<string, any>[] = [];

      // Report Header
      rows.push({
        Section: '═══════════════════════════════════════',
        Field: 'PERFORMANCE DASHBOARD REPORT',
        Value: '═══════════════════════════════════════',
      });

      rows.push({
        Section: 'Report Information',
        Field: 'Generated By',
        Value: currentUser?.name || 'System',
      });
      rows.push({
        Section: 'Report Information',
        Field: 'Generated Date',
        Value: `${timestamp} at ${timeStr}`,
      });

      // Executive Summary
      rows.push({
        Section: '─── Executive Summary ───',
        Field: '',
        Value: '',
      });
      rows.push({
        Section: 'Overall Metrics',
        Field: 'Avg Task Completion Rate',
        Value: `${(reportData.summary?.avgTaskCompletionRate ?? 0).toFixed(1)}%`,
      });
      rows.push({
        Section: 'Overall Metrics',
        Field: 'Avg Meeting Attendance',
        Value: `${(reportData.summary?.avgMeetingAttendanceRate ?? 0).toFixed(1)}%`,
      });
      rows.push({
        Section: 'Overall Metrics',
        Field: 'Total Interactions',
        Value: reportData.summary?.totalInteractions ?? 0,
      });
      if (reportData.summary?.topPerformer) {
        rows.push({
          Section: 'Overall Metrics',
          Field: 'Top Performer',
          Value: reportData.summary.topPerformer.userName,
        });
        rows.push({
          Section: 'Overall Metrics',
          Field: 'Top Performer Score',
          Value: reportData.summary.topPerformer.score?.toFixed(1) || 'N/A',
        });
      }

      // Task Completion Details
      if (
        Array.isArray(reportData.taskCompletionRates) &&
        reportData.taskCompletionRates.length > 0
      ) {
        rows.push({
          Section: '─── Task Completion Analysis ───',
          Field: '',
          Value: '',
        });
        const sortedByCompletion = [...reportData.taskCompletionRates].sort(
          (a, b) => (b.completionRate ?? 0) - (a.completionRate ?? 0),
        );
        sortedByCompletion.forEach((row: any, idx: number) => {
          rows.push({
            Section: `User #${idx + 1}`,
            Field: 'Name',
            Value: row.userName || 'Unknown',
          });
          rows.push({
            Section: `User #${idx + 1}`,
            Field: 'Total Tasks',
            Value: row.totalTasks ?? 0,
          });
          rows.push({
            Section: `User #${idx + 1}`,
            Field: 'Completed',
            Value: row.completedTasks ?? 0,
          });
          rows.push({
            Section: `User #${idx + 1}`,
            Field: 'Completion Rate',
            Value: `${(row.completionRate ?? 0).toFixed(1)}%`,
          });
          rows.push({
            Section: `User #${idx + 1}`,
            Field: 'Trend',
            Value: row.trend || 'Stable',
          });
        });
      }

      // Collaboration Activity
      if (
        Array.isArray(reportData.collaborationActivity) &&
        reportData.collaborationActivity.length > 0
      ) {
        rows.push({
          Section: '─── Collaboration Activity ───',
          Field: '',
          Value: '',
        });
        const sortedByActivity = [...reportData.collaborationActivity].sort(
          (a, b) => (b.activityScore ?? 0) - (a.activityScore ?? 0),
        );
        sortedByActivity.forEach((row: any, idx: number) => {
          rows.push({
            Section: `Collaborator #${idx + 1}`,
            Field: 'Name',
            Value: row.userName || 'Unknown',
          });
          rows.push({
            Section: `Collaborator #${idx + 1}`,
            Field: 'Tasks Completed',
            Value: row.completedTasks ?? 0,
          });
          rows.push({
            Section: `Collaborator #${idx + 1}`,
            Field: 'Meetings Attended',
            Value: row.attendedMeetings ?? 0,
          });
          rows.push({
            Section: `Collaborator #${idx + 1}`,
            Field: 'Messages Sent',
            Value: row.messagesSent ?? 0,
          });
          rows.push({
            Section: `Collaborator #${idx + 1}`,
            Field: 'Total Interactions',
            Value: row.totalInteractions ?? 0,
          });
          rows.push({
            Section: `Collaborator #${idx + 1}`,
            Field: 'Activity Score',
            Value: (row.activityScore ?? 0).toFixed(1),
          });
        });
      }

      // Meeting Attendance
      if (
        Array.isArray(reportData.meetingAttendanceRates) &&
        reportData.meetingAttendanceRates.length > 0
      ) {
        rows.push({
          Section: '─── Meeting Attendance ───',
          Field: '',
          Value: '',
        });
        const sortedByAttendance = [...reportData.meetingAttendanceRates].sort(
          (a, b) => (b.attendanceRate ?? 0) - (a.attendanceRate ?? 0),
        );
        sortedByAttendance.forEach((row: any, idx: number) => {
          rows.push({
            Section: `Attendee #${idx + 1}`,
            Field: 'Name',
            Value: row.userName || 'Unknown',
          });
          rows.push({
            Section: `Attendee #${idx + 1}`,
            Field: 'Total Meetings',
            Value: row.totalMeetings ?? 0,
          });
          rows.push({
            Section: `Attendee #${idx + 1}`,
            Field: 'Attended',
            Value: row.attendedMeetings ?? 0,
          });
          rows.push({
            Section: `Attendee #${idx + 1}`,
            Field: 'Attendance Rate',
            Value: `${(row.attendanceRate ?? 0).toFixed(1)}%`,
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
      throw new BadRequestException(
        'type must be overview, team, or performance',
      );
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
      reportData = await this.reportsService.getOverviewReport(
        req.user,
        rangeValue,
      );
      filename = `overview_report_${rangeValue}`;
    } else if (normalizedType === 'team') {
      if (!resolvedStartDate || !resolvedEndDate) {
        throw new BadRequestException(
          'startDate and endDate are required for team report',
        );
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

    const exportRows = this.buildExportRows(
      normalizedType,
      reportData,
      req.user,
    );
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
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeFilename}.json"`,
      );
      return res.status(200).send({
        type: normalizedType,
        generatedAt: new Date().toISOString(),
        data: reportData,
      });
    }

    if (normalizedFormat === 'csv') {
      const parser = new Json2CsvParser();
      const csv = parser.parse(exportRows.length > 0 ? exportRows : [{}]);
      // Add BOM for proper Thai character display in Excel
      const bom = '\uFEFF';
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeFilename}.csv"`,
      );
      return res.status(200).send(bom + csv);
    }

    if (normalizedFormat === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Team Connect';
      workbook.created = new Date();
      workbook.lastModifiedBy = req.user?.name || 'System';

      // ═══════════════════════════════════════════════════════════════
      // SUMMARY SHEET
      // ═══════════════════════════════════════════════════════════════
      const summarySheet = workbook.addWorksheet('Summary', {
        views: [{ showGridLines: false }],
      });

      // Title
      summarySheet.mergeCells('B2:G2');
      const titleCell = summarySheet.getCell('B2');
      titleCell.value = '📊 Team Connect Report';
      titleCell.font = { size: 24, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' },
      };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      summarySheet.getRow(2).height = 45;

      // Report Type
      const typeLabels: Record<string, string> = {
        overview: 'Personal Productivity Report',
        team: 'Team Productivity Report',
        performance: 'Performance Dashboard Report',
      };
      summarySheet.mergeCells('B4:G4');
      summarySheet.getCell('B4').value = typeLabels[normalizedType] || 'Report';
      summarySheet.getCell('B4').font = {
        size: 14,
        bold: true,
        color: { argb: 'FF1E40AF' },
      };
      summarySheet.getCell('B4').alignment = { horizontal: 'center' };

      // Metadata
      summarySheet.getCell('B6').value = 'Generated By:';
      summarySheet.getCell('C6').value = req.user?.name || 'System';
      summarySheet.getCell('B6').font = {
        bold: true,
        color: { argb: 'FF6B7280' },
      };
      summarySheet.getCell('C6').font = { color: { argb: 'FF374151' } };

      summarySheet.getCell('B7').value = 'Generated Date:';
      summarySheet.getCell('C7').value = new Date().toLocaleDateString(
        'en-US',
        { year: 'numeric', month: 'long', day: 'numeric' },
      );
      summarySheet.getCell('B7').font = {
        bold: true,
        color: { argb: 'FF6B7280' },
      };
      summarySheet.getCell('C7').font = { color: { argb: 'FF374151' } };

      summarySheet.getCell('B8').value = 'Report Period:';
      summarySheet.getCell('C8').value =
        rangeValue.charAt(0).toUpperCase() + rangeValue.slice(1);
      summarySheet.getCell('B8').font = {
        bold: true,
        color: { argb: 'FF6B7280' },
      };
      summarySheet.getCell('C8').font = { color: { argb: 'FF374151' } };

      if (teamId) {
        summarySheet.getCell('E6').value = 'Team ID:';
        summarySheet.getCell('F6').value = teamId;
        summarySheet.getCell('E6').font = {
          bold: true,
          color: { argb: 'FF6B7280' },
        };
      }

      // KPI Cards based on report type
      let cardRow = 11;

      if (normalizedType === 'overview' && reportData) {
        const score = reportData.productivityScore ?? 0;
        const performance =
          score >= 80
            ? 'Excellent'
            : score >= 60
              ? 'Good'
              : score >= 40
                ? 'Average'
                : 'Needs Improvement';
        const scoreColor =
          score >= 80
            ? 'FF10B981'
            : score >= 60
              ? 'FF3B82F6'
              : score >= 40
                ? 'FFF59E0B'
                : 'FFEF4444';

        // KPI Card 1 - Productivity Score
        summarySheet.mergeCells(`B${cardRow}:C${cardRow + 3}`);
        summarySheet.getCell(`B${cardRow}`).value = 'Productivity Score';
        summarySheet.getCell(`B${cardRow}`).font = {
          size: 11,
          bold: true,
          color: { argb: 'FF374151' },
        };
        summarySheet.getCell(`B${cardRow}`).alignment = {
          horizontal: 'center',
          vertical: 'top',
        };
        summarySheet.getCell(`B${cardRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        };
        summarySheet.getCell(`B${cardRow}`).border = {
          top: { style: 'medium', color: { argb: scoreColor } },
          left: { style: 'medium', color: { argb: scoreColor } },
          right: { style: 'medium', color: { argb: scoreColor } },
          bottom: { style: 'medium', color: { argb: scoreColor } },
        };

        summarySheet.getCell(`B${cardRow + 1}`).value = score.toFixed(0) + '%';
        summarySheet.getCell(`B${cardRow + 1}`).font = {
          size: 32,
          bold: true,
          color: { argb: scoreColor },
        };
        summarySheet.getCell(`B${cardRow + 1}`).alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        summarySheet.getCell(`B${cardRow + 2}`).value = performance;
        summarySheet.getCell(`B${cardRow + 2}`).font = {
          size: 12,
          color: { argb: 'FF6B7280' },
        };
        summarySheet.getCell(`B${cardRow + 2}`).alignment = {
          horizontal: 'center',
        };

        // KPI Card 2 - Tasks
        summarySheet.mergeCells(`E${cardRow}:F${cardRow + 3}`);
        summarySheet.getCell(`E${cardRow}`).value = 'Tasks Completed';
        summarySheet.getCell(`E${cardRow}`).font = {
          size: 11,
          bold: true,
          color: { argb: 'FF374151' },
        };
        summarySheet.getCell(`E${cardRow}`).alignment = {
          horizontal: 'center',
          vertical: 'top',
        };
        summarySheet.getCell(`E${cardRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        };
        summarySheet.getCell(`E${cardRow}`).border = {
          top: { style: 'medium', color: { argb: 'FF3B82F6' } },
          left: { style: 'medium', color: { argb: 'FF3B82F6' } },
          right: { style: 'medium', color: { argb: 'FF3B82F6' } },
          bottom: { style: 'medium', color: { argb: 'FF3B82F6' } },
        };
        summarySheet.getCell(`E${cardRow + 1}`).value =
          reportData.tasksCompleted ?? 0;
        summarySheet.getCell(`E${cardRow + 1}`).font = {
          size: 32,
          bold: true,
          color: { argb: 'FF3B82F6' },
        };
        summarySheet.getCell(`E${cardRow + 1}`).alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        // KPI Card 3 - Meetings
        summarySheet.mergeCells(`H${cardRow}:I${cardRow + 3}`);
        summarySheet.getCell(`H${cardRow}`).value = 'Meetings Attended';
        summarySheet.getCell(`H${cardRow}`).font = {
          size: 11,
          bold: true,
          color: { argb: 'FF374151' },
        };
        summarySheet.getCell(`H${cardRow}`).alignment = {
          horizontal: 'center',
          vertical: 'top',
        };
        summarySheet.getCell(`H${cardRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        };
        summarySheet.getCell(`H${cardRow}`).border = {
          top: { style: 'medium', color: { argb: 'FF10B981' } },
          left: { style: 'medium', color: { argb: 'FF10B981' } },
          right: { style: 'medium', color: { argb: 'FF10B981' } },
          bottom: { style: 'medium', color: { argb: 'FF10B981' } },
        };
        summarySheet.getCell(`H${cardRow + 1}`).value =
          reportData.meetingsAttended ?? 0;
        summarySheet.getCell(`H${cardRow + 1}`).font = {
          size: 32,
          bold: true,
          color: { argb: 'FF10B981' },
        };
        summarySheet.getCell(`H${cardRow + 1}`).alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };
      }

      if (normalizedType === 'team' && reportData) {
        const completionRate =
          (reportData.summary?.tasks?.total ?? 0) > 0
            ? ((reportData.summary?.tasks?.completed ?? 0) /
                (reportData.summary?.tasks?.total ?? 1)) *
              100
            : 0;
        const rateColor =
          completionRate >= 80
            ? 'FF10B981'
            : completionRate >= 60
              ? 'FF3B82F6'
              : completionRate >= 40
                ? 'FFF59E0B'
                : 'FFEF4444';

        // Team Completion Rate Card
        summarySheet.mergeCells(`B${cardRow}:C${cardRow + 3}`);
        summarySheet.getCell(`B${cardRow}`).value = 'Team Completion Rate';
        summarySheet.getCell(`B${cardRow}`).font = {
          size: 11,
          bold: true,
          color: { argb: 'FF374151' },
        };
        summarySheet.getCell(`B${cardRow}`).alignment = {
          horizontal: 'center',
          vertical: 'top',
        };
        summarySheet.getCell(`B${cardRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        };
        summarySheet.getCell(`B${cardRow}`).border = {
          top: { style: 'medium', color: { argb: rateColor } },
          left: { style: 'medium', color: { argb: rateColor } },
          right: { style: 'medium', color: { argb: rateColor } },
          bottom: { style: 'medium', color: { argb: rateColor } },
        };
        summarySheet.getCell(`B${cardRow + 1}`).value =
          completionRate.toFixed(0) + '%';
        summarySheet.getCell(`B${cardRow + 1}`).font = {
          size: 32,
          bold: true,
          color: { argb: rateColor },
        };
        summarySheet.getCell(`B${cardRow + 1}`).alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };
        summarySheet.getCell(`B${cardRow + 2}`).value =
          `${reportData.summary?.tasks?.completed ?? 0} of ${reportData.summary?.tasks?.total ?? 0} tasks`;
        summarySheet.getCell(`B${cardRow + 2}`).font = {
          size: 12,
          color: { argb: 'FF6B7280' },
        };
        summarySheet.getCell(`B${cardRow + 2}`).alignment = {
          horizontal: 'center',
        };

        // Team Members Card
        summarySheet.mergeCells(`E${cardRow}:F${cardRow + 3}`);
        summarySheet.getCell(`E${cardRow}`).value = 'Team Members';
        summarySheet.getCell(`E${cardRow}`).font = {
          size: 11,
          bold: true,
          color: { argb: 'FF374151' },
        };
        summarySheet.getCell(`E${cardRow}`).alignment = {
          horizontal: 'center',
          vertical: 'top',
        };
        summarySheet.getCell(`E${cardRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        };
        summarySheet.getCell(`E${cardRow}`).border = {
          top: { style: 'medium', color: { argb: 'FF8B5CF6' } },
          left: { style: 'medium', color: { argb: 'FF8B5CF6' } },
          right: { style: 'medium', color: { argb: 'FF8B5CF6' } },
          bottom: { style: 'medium', color: { argb: 'FF8B5CF6' } },
        };
        summarySheet.getCell(`E${cardRow + 1}`).value =
          reportData.summary?.members ?? 0;
        summarySheet.getCell(`E${cardRow + 1}`).font = {
          size: 32,
          bold: true,
          color: { argb: 'FF8B5CF6' },
        };
        summarySheet.getCell(`E${cardRow + 1}`).alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        // Total Meetings Card
        summarySheet.mergeCells(`H${cardRow}:I${cardRow + 3}`);
        summarySheet.getCell(`H${cardRow}`).value = 'Total Meetings';
        summarySheet.getCell(`H${cardRow}`).font = {
          size: 11,
          bold: true,
          color: { argb: 'FF374151' },
        };
        summarySheet.getCell(`H${cardRow}`).alignment = {
          horizontal: 'center',
          vertical: 'top',
        };
        summarySheet.getCell(`H${cardRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        };
        summarySheet.getCell(`H${cardRow}`).border = {
          top: { style: 'medium', color: { argb: 'FF10B981' } },
          left: { style: 'medium', color: { argb: 'FF10B981' } },
          right: { style: 'medium', color: { argb: 'FF10B981' } },
          bottom: { style: 'medium', color: { argb: 'FF10B981' } },
        };
        summarySheet.getCell(`H${cardRow + 1}`).value =
          reportData.summary?.meetings?.total ?? 0;
        summarySheet.getCell(`H${cardRow + 1}`).font = {
          size: 32,
          bold: true,
          color: { argb: 'FF10B981' },
        };
        summarySheet.getCell(`H${cardRow + 1}`).alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        // Top Performer Section
        if (reportData.members && reportData.members.length > 0) {
          const sortedMembers = [...reportData.members].sort(
            (a, b) => (b.tasks?.completed ?? 0) - (a.tasks?.completed ?? 0),
          );
          const topPerformer = sortedMembers[0];

          cardRow += 6;
          summarySheet.mergeCells(`B${cardRow}:I${cardRow + 2}`);
          summarySheet.getCell(`B${cardRow}`).value =
            '🏆 Top Performer: ' + (topPerformer?.user?.name || 'N/A');
          summarySheet.getCell(`B${cardRow}`).font = {
            size: 14,
            bold: true,
            color: { argb: 'FF065F46' },
          };
          summarySheet.getCell(`B${cardRow}`).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFECFDF5' },
          };
          summarySheet.getCell(`B${cardRow}`).alignment = {
            horizontal: 'center',
            vertical: 'middle',
          };
          summarySheet.getCell(`B${cardRow}`).border = {
            top: { style: 'medium', color: { argb: 'FF10B981' } },
            left: { style: 'medium', color: { argb: 'FF10B981' } },
            right: { style: 'medium', color: { argb: 'FF10B981' } },
            bottom: { style: 'medium', color: { argb: 'FF10B981' } },
          };
          summarySheet.getCell(`B${cardRow + 1}`).value =
            `${topPerformer?.tasks?.completed ?? 0} tasks completed`;
          summarySheet.getCell(`B${cardRow + 1}`).font = {
            size: 12,
            color: { argb: 'FF059669' },
          };
          summarySheet.getCell(`B${cardRow + 1}`).alignment = {
            horizontal: 'center',
          };
        }
      }

      if (normalizedType === 'performance' && reportData) {
        const avgCompletion = reportData.summary?.avgTaskCompletionRate ?? 0;
        const avgAttendance = reportData.summary?.avgMeetingAttendanceRate ?? 0;

        // Avg Task Completion Card
        summarySheet.mergeCells(`B${cardRow}:C${cardRow + 3}`);
        summarySheet.getCell(`B${cardRow}`).value = 'Avg Task Completion';
        summarySheet.getCell(`B${cardRow}`).font = {
          size: 11,
          bold: true,
          color: { argb: 'FF374151' },
        };
        summarySheet.getCell(`B${cardRow}`).alignment = {
          horizontal: 'center',
          vertical: 'top',
        };
        summarySheet.getCell(`B${cardRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        };
        summarySheet.getCell(`B${cardRow}`).border = {
          top: { style: 'medium', color: { argb: 'FF3B82F6' } },
          left: { style: 'medium', color: { argb: 'FF3B82F6' } },
          right: { style: 'medium', color: { argb: 'FF3B82F6' } },
          bottom: { style: 'medium', color: { argb: 'FF3B82F6' } },
        };
        summarySheet.getCell(`B${cardRow + 1}`).value =
          avgCompletion.toFixed(0) + '%';
        summarySheet.getCell(`B${cardRow + 1}`).font = {
          size: 32,
          bold: true,
          color: { argb: 'FF3B82F6' },
        };
        summarySheet.getCell(`B${cardRow + 1}`).alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };
        summarySheet.getCell(`B${cardRow + 2}`).value = 'Team Average';
        summarySheet.getCell(`B${cardRow + 2}`).font = {
          size: 12,
          color: { argb: 'FF6B7280' },
        };
        summarySheet.getCell(`B${cardRow + 2}`).alignment = {
          horizontal: 'center',
        };

        // Avg Meeting Attendance Card
        summarySheet.mergeCells(`E${cardRow}:F${cardRow + 3}`);
        summarySheet.getCell(`E${cardRow}`).value = 'Avg Meeting Attendance';
        summarySheet.getCell(`E${cardRow}`).font = {
          size: 11,
          bold: true,
          color: { argb: 'FF374151' },
        };
        summarySheet.getCell(`E${cardRow}`).alignment = {
          horizontal: 'center',
          vertical: 'top',
        };
        summarySheet.getCell(`E${cardRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        };
        summarySheet.getCell(`E${cardRow}`).border = {
          top: { style: 'medium', color: { argb: 'FF10B981' } },
          left: { style: 'medium', color: { argb: 'FF10B981' } },
          right: { style: 'medium', color: { argb: 'FF10B981' } },
          bottom: { style: 'medium', color: { argb: 'FF10B981' } },
        };
        summarySheet.getCell(`E${cardRow + 1}`).value =
          avgAttendance.toFixed(0) + '%';
        summarySheet.getCell(`E${cardRow + 1}`).font = {
          size: 32,
          bold: true,
          color: { argb: 'FF10B981' },
        };
        summarySheet.getCell(`E${cardRow + 1}`).alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        // Total Interactions Card
        summarySheet.mergeCells(`H${cardRow}:I${cardRow + 3}`);
        summarySheet.getCell(`H${cardRow}`).value = 'Total Interactions';
        summarySheet.getCell(`H${cardRow}`).font = {
          size: 11,
          bold: true,
          color: { argb: 'FF374151' },
        };
        summarySheet.getCell(`H${cardRow}`).alignment = {
          horizontal: 'center',
          vertical: 'top',
        };
        summarySheet.getCell(`H${cardRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        };
        summarySheet.getCell(`H${cardRow}`).border = {
          top: { style: 'medium', color: { argb: 'FF8B5CF6' } },
          left: { style: 'medium', color: { argb: 'FF8B5CF6' } },
          right: { style: 'medium', color: { argb: 'FF8B5CF6' } },
          bottom: { style: 'medium', color: { argb: 'FF8B5CF6' } },
        };
        summarySheet.getCell(`H${cardRow + 1}`).value =
          reportData.summary?.totalInteractions ?? 0;
        summarySheet.getCell(`H${cardRow + 1}`).font = {
          size: 32,
          bold: true,
          color: { argb: 'FF8B5CF6' },
        };
        summarySheet.getCell(`H${cardRow + 1}`).alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        // Top Performer
        if (reportData.summary?.topPerformer) {
          cardRow += 6;
          summarySheet.mergeCells(`B${cardRow}:I${cardRow + 2}`);
          summarySheet.getCell(`B${cardRow}`).value =
            '🏆 Top Performer: ' + reportData.summary.topPerformer.userName;
          summarySheet.getCell(`B${cardRow}`).font = {
            size: 14,
            bold: true,
            color: { argb: 'FF065F46' },
          };
          summarySheet.getCell(`B${cardRow}`).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFECFDF5' },
          };
          summarySheet.getCell(`B${cardRow}`).alignment = {
            horizontal: 'center',
            vertical: 'middle',
          };
          summarySheet.getCell(`B${cardRow}`).border = {
            top: { style: 'medium', color: { argb: 'FF10B981' } },
            left: { style: 'medium', color: { argb: 'FF10B981' } },
            right: { style: 'medium', color: { argb: 'FF10B981' } },
            bottom: { style: 'medium', color: { argb: 'FF10B981' } },
          };
          summarySheet.getCell(`B${cardRow + 1}`).value =
            'Score: ' +
            (reportData.summary.topPerformer.score?.toFixed(1) || 'N/A');
          summarySheet.getCell(`B${cardRow + 1}`).font = {
            size: 12,
            color: { argb: 'FF059669' },
          };
          summarySheet.getCell(`B${cardRow + 1}`).alignment = {
            horizontal: 'center',
          };
        }
      }

      // Set column widths for summary - wider for Thai text support
      summarySheet.columns.forEach((col, i) => {
        col.width = i === 0 ? 3 : 18;
      });

      // ═══════════════════════════════════════════════════════════════
      // DETAILED DATA SHEET
      // ═══════════════════════════════════════════════════════════════
      const dataSheet = workbook.addWorksheet('Detailed Data');
      const rows = exportRows.length > 0 ? exportRows : [{}];

      // Group by section for better organization
      const sections: Record<string, any[]> = {};
      rows.forEach((row) => {
        const section = row.Section || row.category || 'Data';
        if (!sections[section]) sections[section] = [];
        sections[section].push(row);
      });

      let currentRow = 1;

      Object.entries(sections).forEach(([sectionName, sectionRows]) => {
        // Skip decorative headers
        if (sectionName.includes('═══') || sectionName.includes('───')) {
          return;
        }

        // Section header
        dataSheet.getCell(`A${currentRow}`).value = sectionName;
        dataSheet.getCell(`A${currentRow}`).font = {
          size: 12,
          bold: true,
          color: { argb: 'FF1E40AF' },
        };
        dataSheet.getCell(`A${currentRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E7FF' },
        };
        dataSheet.mergeCells(`A${currentRow}:F${currentRow}`);
        dataSheet.getRow(currentRow).height = 25;
        currentRow++;

        // Table headers
        const headers = Object.keys(sectionRows[0]).filter(
          (h) => h !== 'Section' && h !== 'category',
        );
        if (headers.length > 0) {
          headers.forEach((h, i) => {
            const cell = dataSheet.getCell(currentRow, i + 1);
            cell.value = h
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, (s) => s.toUpperCase());
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF6B7280' },
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
              left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
              bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
              right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            };
          });
          currentRow++;

          // Data rows
          sectionRows.forEach((row, rowIndex) => {
            headers.forEach((h, i) => {
              const cell = dataSheet.getCell(currentRow, i + 1);
              cell.value = row[h] ?? '';
              cell.alignment = { vertical: 'middle' };
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              };
              // Alternate row colors
              if (rowIndex % 2 === 0) {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFF9FAFB' },
                };
              }
            });
            currentRow++;
          });
        }
        currentRow++; // Empty row between sections
      });

      // Auto-fit columns for data sheet - optimized for Thai text
      dataSheet.columns.forEach((col) => {
        let maxLen = 15; // Start with wider default for Thai
        if (col.eachCell) {
          col.eachCell({ includeEmpty: true }, (cell) => {
            const val = String(cell.value || '');
            // Thai characters are wider, multiply by 1.5
            const thaiCharCount = (val.match(/[\u0E00-\u0E7F]/g) || []).length;
            const otherCharCount = val.length - thaiCharCount;
            const effectiveLen = otherCharCount + thaiCharCount * 1.8;
            if (effectiveLen > maxLen) maxLen = Math.min(effectiveLen + 3, 50);
          });
        }
        col.width = maxLen;
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeFilename}.xlsx"`,
      );

      await workbook.xlsx.write(res);
      return res.end();
    }

    if (normalizedFormat === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeFilename}.pdf"`,
      );

      // Register Thai font for proper Thai character support
      // Try multiple paths to find the font file
      const possiblePaths = [
        path.join(__dirname, '../../fonts/THSarabunNew.ttf'), // From src/
        path.join(__dirname, '../fonts/THSarabunNew.ttf'), // From dist/
        path.join(process.cwd(), 'fonts/THSarabunNew.ttf'), // From cwd
      ];

      let thaiFontPath: string | null = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          thaiFontPath = p;
          break;
        }
      }

      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        bufferPages: true,
        autoFirstPage: false,
      });

      // Register Thai font
      let hasThaiFont = false;
      if (thaiFontPath) {
        try {
          doc.registerFont('Thai', thaiFontPath);
          hasThaiFont = true;
          console.log('Thai font registered successfully from:', thaiFontPath);
        } catch (e) {
          console.warn('Failed to register Thai font:', e);
        }
      } else {
        console.warn('Thai font file not found in any location');
      }

      doc.pipe(res);

      // ═══════════════════════════════════════════════════════════════
      // COVER PAGE
      // ═══════════════════════════════════════════════════════════════
      doc.addPage();

      // Full page background gradient effect
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#1E3A8A');

      // Decorative circles
      doc
        .circle(doc.page.width - 100, 150, 200)
        .fillOpacity(0.1)
        .fill('#3B82F6');
      doc
        .circle(100, doc.page.height - 100, 150)
        .fillOpacity(0.1)
        .fill('#60A5FA');

      // Company logo area
      doc
        .fillColor('#FFFFFF')
        .fontSize(42)
        .font('Helvetica-Bold')
        .text('Team Connect', 50, 120, { align: 'center' });
      doc
        .fontSize(16)
        .font('Helvetica')
        .fillColor('#93C5FD')
        .text('Professional Report', 50, 165, { align: 'center' });

      // Report type
      const typeLabels: Record<string, string> = {
        overview: 'Personal Productivity Report',
        team: 'Team Productivity Report',
        performance: 'Performance Dashboard Report',
      };

      doc
        .rect(60, 220, doc.page.width - 120, 80)
        .fillOpacity(0.2)
        .fill('#FFFFFF');
      doc
        .fillColor('#FFFFFF')
        .fontSize(28)
        .font('Helvetica-Bold')
        .text(typeLabels[normalizedType] || 'Report', 50, 240, {
          align: 'center',
        });

      // Report period
      doc
        .fontSize(14)
        .font('Helvetica')
        .fillColor('#BFDBFE')
        .text(
          `Report Period: ${rangeValue.charAt(0).toUpperCase() + rangeValue.slice(1)}`,
          50,
          280,
          { align: 'center' },
        );

      // Generated info (with Thai font support for user name)
      const generatedByName = req.user?.name || 'System';
      doc
        .fontSize(11)
        .font(this.getFontForText(generatedByName, hasThaiFont))
        .fillColor('#93C5FD')
        .text(`Generated by: ${generatedByName}`, 50, 380, {
          align: 'center',
        });
      doc.text(
        `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        50,
        400,
        { align: 'center' },
      );
      doc.text(
        `Time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
        50,
        420,
        { align: 'center' },
      );

      // Footer on cover
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#60A5FA')
        .text(
          'Confidential - For Internal Use Only',
          50,
          doc.page.height - 50,
          { align: 'center' },
        );

      // ═══════════════════════════════════════════════════════════════
      // EXECUTIVE SUMMARY PAGE
      // ═══════════════════════════════════════════════════════════════
      doc.addPage();

      // Header
      doc.rect(0, 0, doc.page.width, 50).fill('#3B82F6');
      doc
        .fillColor('#FFFFFF')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('Executive Summary', 50, 15);

      // Summary content based on type
      let yPos = 70;

      if (normalizedType === 'overview' && reportData) {
        const score = reportData.productivityScore ?? 0;
        const performance =
          score >= 80
            ? 'Excellent'
            : score >= 60
              ? 'Good'
              : score >= 40
                ? 'Average'
                : 'Needs Improvement';
        const performanceColor =
          score >= 80
            ? '#10B981'
            : score >= 60
              ? '#3B82F6'
              : score >= 40
                ? '#F59E0B'
                : '#EF4444';

        // Performance Score Card
        doc.rect(50, yPos, 200, 100).fill('#F3F4F6').stroke('#E5E7EB');
        doc
          .fillColor('#374151')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Overall Performance', 60, yPos + 10);
        doc
          .fontSize(36)
          .font('Helvetica-Bold')
          .fillColor(performanceColor)
          .text(`${score.toFixed(0)}%`, 60, yPos + 35);
        doc
          .fontSize(14)
          .font('Helvetica')
          .fillColor('#6B7280')
          .text(performance, 60, yPos + 75);

        // Key Metrics
        doc.rect(270, yPos, 220, 100).fill('#F3F4F6').stroke('#E5E7EB');
        doc
          .fillColor('#374151')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Key Metrics', 280, yPos + 10);
        doc.fontSize(10).font('Helvetica').fillColor('#6B7280');
        doc.text(
          `Tasks Completed: ${reportData.tasksCompleted ?? 0}`,
          280,
          yPos + 35,
        );
        doc.text(
          `Meetings Attended: ${reportData.meetingsAttended ?? 0}`,
          280,
          yPos + 55,
        );
        doc.text(
          `Messages Sent: ${reportData.messagesSent ?? 0}`,
          280,
          yPos + 75,
        );

        yPos += 130;

        // Insights
        doc
          .fillColor('#374151')
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('Insights & Recommendations', 50, yPos);
        yPos += 25;
        doc.fontSize(10).font('Helvetica').fillColor('#6B7280');

        if (score >= 80) {
          doc.text(
            '✓ Outstanding performance! Keep up the excellent work.',
            50,
            yPos,
          );
          yPos += 15;
          doc.text(
            '✓ Consider mentoring team members to share best practices.',
            50,
            yPos,
          );
        } else if (score >= 60) {
          doc.text(
            '• Good progress! Focus on improving task completion rate.',
            50,
            yPos,
          );
          yPos += 15;
          doc.text(
            '• Consider attending more team meetings for better collaboration.',
            50,
            yPos,
          );
        } else {
          doc.text(
            '• Consider setting clear daily goals to improve productivity.',
            50,
            yPos,
          );
          yPos += 15;
          doc.text(
            '• Review task priorities and focus on high-impact activities.',
            50,
            yPos,
          );
        }
      }

      if (normalizedType === 'team' && reportData) {
        const completionRate =
          (reportData.summary?.tasks?.total ?? 0) > 0
            ? ((reportData.summary?.tasks?.completed ?? 0) /
                (reportData.summary?.tasks?.total ?? 1)) *
              100
            : 0;
        const rateColor =
          completionRate >= 80
            ? '#10B981'
            : completionRate >= 60
              ? '#3B82F6'
              : completionRate >= 40
                ? '#F59E0B'
                : '#EF4444';

        // Team Performance Card
        doc.rect(50, yPos, 200, 100).fill('#F3F4F6').stroke('#E5E7EB');
        doc
          .fillColor('#374151')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Team Completion Rate', 60, yPos + 10);
        doc
          .fontSize(36)
          .font('Helvetica-Bold')
          .fillColor(rateColor)
          .text(`${completionRate.toFixed(0)}%`, 60, yPos + 35);
        doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor('#6B7280')
          .text(
            `${reportData.summary?.tasks?.completed ?? 0} of ${reportData.summary?.tasks?.total ?? 0} tasks`,
            60,
            yPos + 75,
          );

        // Team Stats
        doc.rect(270, yPos, 220, 100).fill('#F3F4F6').stroke('#E5E7EB');
        doc
          .fillColor('#374151')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Team Statistics', 280, yPos + 10);
        doc.fontSize(10).font('Helvetica').fillColor('#6B7280');
        doc.text(
          `Team Members: ${reportData.summary?.members ?? 0}`,
          280,
          yPos + 35,
        );
        doc.text(
          `Total Meetings: ${reportData.summary?.meetings?.total ?? 0}`,
          280,
          yPos + 55,
        );
        doc.text(
          `In Progress: ${reportData.summary?.tasks?.inProgress ?? 0}`,
          280,
          yPos + 75,
        );

        yPos += 130;

        // Top Performer
        if (reportData.members && reportData.members.length > 0) {
          const sortedMembers = [...reportData.members].sort(
            (a, b) => (b.tasks?.completed ?? 0) - (a.tasks?.completed ?? 0),
          );
          const topPerformer = sortedMembers[0];

          doc
            .rect(50, yPos, doc.page.width - 100, 60)
            .fill('#ECFDF5')
            .stroke('#10B981');
          doc
            .fillColor('#065F46')
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('🏆 Top Performer', 60, yPos + 10);
          doc
            .fontSize(14)
            .font(
              this.getBoldFontForText(
                topPerformer?.user?.name || 'N/A',
                hasThaiFont,
              ),
            )
            .fillColor('#047857')
            .text(topPerformer?.user?.name || 'N/A', 60, yPos + 30);
          doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor('#059669')
            .text(
              `${topPerformer?.tasks?.completed ?? 0} tasks completed`,
              60,
              yPos + 48,
            );
        }
      }

      if (normalizedType === 'performance' && reportData) {
        const avgCompletion = reportData.summary?.avgTaskCompletionRate ?? 0;
        const avgAttendance = reportData.summary?.avgMeetingAttendanceRate ?? 0;

        // Average Completion Card
        doc.rect(50, yPos, 200, 100).fill('#F3F4F6').stroke('#E5E7EB');
        doc
          .fillColor('#374151')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Avg Task Completion', 60, yPos + 10);
        doc
          .fontSize(36)
          .font('Helvetica-Bold')
          .fillColor('#3B82F6')
          .text(`${avgCompletion.toFixed(0)}%`, 60, yPos + 35);
        doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor('#6B7280')
          .text('Team Average', 60, yPos + 75);

        // Average Attendance Card
        doc.rect(270, yPos, 220, 100).fill('#F3F4F6').stroke('#E5E7EB');
        doc
          .fillColor('#374151')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Avg Meeting Attendance', 280, yPos + 10);
        doc
          .fontSize(36)
          .font('Helvetica-Bold')
          .fillColor('#10B981')
          .text(`${avgAttendance.toFixed(0)}%`, 280, yPos + 35);
        doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor('#6B7280')
          .text('Team Average', 280, yPos + 75);

        yPos += 130;

        // Top Performer
        if (reportData.summary?.topPerformer) {
          doc
            .rect(50, yPos, doc.page.width - 100, 60)
            .fill('#ECFDF5')
            .stroke('#10B981');
          doc
            .fillColor('#065F46')
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('🏆 Top Performer', 60, yPos + 10);
          doc
            .fontSize(14)
            .font(
              this.getBoldFontForText(
                reportData.summary.topPerformer.userName,
                hasThaiFont,
              ),
            )
            .fillColor('#047857')
            .text(reportData.summary.topPerformer.userName, 60, yPos + 30);
          doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor('#059669')
            .text(
              `Score: ${reportData.summary.topPerformer.score?.toFixed(1) || 'N/A'}`,
              60,
              yPos + 48,
            );
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // DETAILED DATA PAGES
      // ═══════════════════════════════════════════════════════════════
      doc.addPage();

      // Header
      doc.rect(0, 0, doc.page.width, 50).fill('#3B82F6');
      doc
        .fillColor('#FFFFFF')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('Detailed Report', 50, 15);

      yPos = 70;

      // Group rows by section
      const rows = exportRows.length > 0 ? exportRows : [{}];
      const sections: Record<string, any[]> = {};
      rows.forEach((row) => {
        const section = row.Section || row.category || 'Data';
        if (!sections[section]) sections[section] = [];
        sections[section].push(row);
      });

      Object.entries(sections).forEach(([sectionName, sectionRows]) => {
        // Check if we need a new page
        if (yPos > doc.page.height - 150) {
          doc.addPage();
          doc.rect(0, 0, doc.page.width, 50).fill('#3B82F6');
          doc
            .fillColor('#FFFFFF')
            .fontSize(20)
            .font('Helvetica-Bold')
            .text('Detailed Report (continued)', 50, 15);
          yPos = 70;
        }

        // Skip decorative headers
        if (sectionName.includes('═══') || sectionName.includes('───')) {
          return;
        }

        // Section header
        doc.rect(50, yPos, doc.page.width - 100, 25).fill('#EFF6FF');
        doc
          .fillColor('#1E40AF')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(sectionName, 60, yPos + 6);
        yPos += 35;

        // Table headers
        const headers = Object.keys(sectionRows[0]).filter(
          (h) => h !== 'Section' && h !== 'category',
        );
        if (headers.length > 0) {
          const colWidth = Math.min(
            130,
            (doc.page.width - 120) / headers.length,
          );

          // Header row
          doc.rect(50, yPos, doc.page.width - 100, 22).fill('#6B7280');
          doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
          headers.forEach((h, i) => {
            const label = h
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, (s) => s.toUpperCase());
            doc.text(label, 55 + i * colWidth, yPos + 5, {
              width: colWidth - 5,
            });
          });
          yPos += 24;

          // Data rows
          sectionRows.forEach((row, rowIndex) => {
            if (yPos > doc.page.height - 50) {
              doc.addPage();
              doc.rect(0, 0, doc.page.width, 50).fill('#3B82F6');
              doc
                .fillColor('#FFFFFF')
                .fontSize(20)
                .font('Helvetica-Bold')
                .text('Detailed Report (continued)', 50, 15);
              yPos = 70;
            }

            const bgColor = rowIndex % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
            doc.rect(50, yPos, doc.page.width - 100, 20).fill(bgColor);
            doc.fillColor('#374151').fontSize(8);
            headers.forEach((h, i) => {
              const value = row[h] ?? '';
              const valueStr = String(value);
              // Use Thai font for values containing Thai characters (like user names)
              doc.font(this.getFontForText(valueStr, hasThaiFont));
              doc.text(valueStr, 55 + i * colWidth, yPos + 5, {
                width: colWidth - 5,
              });
            });
            yPos += 22;
          });
        }
        yPos += 15;
      });

      // Footer on all pages
      const pages = doc.bufferedPageRange();
      for (let i = pages.start; i < pages.start + pages.count; i++) {
        doc.switchToPage(i);
        doc.rect(0, doc.page.height - 35, doc.page.width, 35).fill('#F3F4F6');
        doc
          .fillColor('#9CA3AF')
          .fontSize(8)
          .font('Helvetica')
          .text(
            `Team Connect Report | Generated on ${new Date().toLocaleDateString('en-US')} | Page ${i - pages.start + 1} of ${pages.count}`,
            50,
            doc.page.height - 20,
            { align: 'center' },
          );
      }

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
