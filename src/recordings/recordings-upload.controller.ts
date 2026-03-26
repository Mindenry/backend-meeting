import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Request,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecordingsService } from './recordings.service';
import { DriveService } from '../drive/drive.service';
import {
  StorageService,
  UploadedFile as StorageUploadedFile,
} from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';

@Controller('recordings')
@UseGuards(JwtAuthGuard)
export class RecordingsUploadController {
  private readonly logger = new Logger(RecordingsUploadController.name);

  constructor(
    private readonly recordingsService: RecordingsService,
    private readonly driveService: DriveService,
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async convertToMp4(
    inputBuffer: Buffer,
  ): Promise<{
    buffer: Buffer | null;
    error?: string;
    ffmpegAvailable?: boolean;
    diagnostics?: string[];
    usedCommand?: string;
  }> {
    const tempBase = `recording-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const inputPath = join(tmpdir(), `${tempBase}.webm`);
    const outputPath = join(tmpdir(), `${tempBase}.mp4`);

    const ffmpegArgProfiles = [
      {
        name: 'h264-aac',
        args: [
          '-y',
          '-i',
          inputPath,
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-crf',
          '23',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '128k',
          '-movflags',
          '+faststart',
          '-map',
          '0',
          '-shortest',
          outputPath,
        ],
      },
      {
        name: 'mpeg4-aac-fallback',
        args: [
          '-y',
          '-i',
          inputPath,
          '-c:v',
          'mpeg4',
          '-q:v',
          '5',
          '-c:a',
          'aac',
          '-b:a',
          '128k',
          '-movflags',
          '+faststart',
          '-map',
          '0',
          '-shortest',
          outputPath,
        ],
      },
    ];

    const runFfmpeg = async (
      command: string,
      label: string,
      args: string[],
      profileName: string,
    ): Promise<{ success: boolean; error?: string; stderrTail?: string }> => {
      this.logger.log(
        `[Recording] Trying FFmpeg (${label}, profile=${profileName}): ${command}`,
      );
      return new Promise<{ success: boolean; error?: string; stderrTail?: string }>((resolve) => {
        const ffmpeg = spawn(command, args);

        let errorOutput = '';
        ffmpeg.stderr.on('data', (chunk) => {
          errorOutput += chunk.toString();
        });

        ffmpeg.on('error', (err) => {
          resolve({
            success: false,
            error: `Spawn error: ${err.message}`,
            stderrTail: errorOutput.slice(-500),
          });
        });

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true });
          } else {
            resolve({
              success: false,
              error: `Exit code ${code}: ${errorOutput.slice(-300) || 'Unknown error'}`,
              stderrTail: errorOutput.slice(-500),
            });
          }
        });
      });
    };

    try {
      await fs.writeFile(inputPath, inputBuffer);
      this.logger.log(`[Recording] Starting FFmpeg conversion: ${inputPath} -> ${outputPath}`);

      const attemptedCommands: Array<{ command: string; label: string }> = [];

      if (process.env.FFMPEG_PATH) {
        attemptedCommands.push({ command: process.env.FFMPEG_PATH, label: 'FFMPEG_PATH' });
      }

      // Use system ffmpeg first (works reliably in Railway Docker image)
      attemptedCommands.push({ command: 'ffmpeg', label: 'system' });

      try {
        const ffmpegStaticModule = await import('ffmpeg-static');
        const resolved =
          (ffmpegStaticModule as any)?.default || (ffmpegStaticModule as any);
        if (typeof resolved === 'string' && resolved.length > 0) {
          attemptedCommands.push({ command: resolved, label: 'ffmpeg-static' });
        }
      } catch {
        // no-op
      }

      let lastError = 'FFmpeg command not found';
      let success = false;
      let usedCommand: string | undefined;
      const diagnostics: string[] = [];

      for (const candidate of attemptedCommands) {
        for (const profile of ffmpegArgProfiles) {
          const result = await runFfmpeg(
            candidate.command,
            candidate.label,
            profile.args,
            profile.name,
          );
          if (result.success) {
            success = true;
            usedCommand = `${candidate.label}:${candidate.command}:${profile.name}`;
            diagnostics.push(`SUCCESS ${usedCommand}`);
            break;
          }
          const stderrInfo = result.stderrTail
            ? ` | stderr=${result.stderrTail.replace(/\s+/g, ' ').slice(-280)}`
            : '';
          lastError = `${candidate.label} (${candidate.command}) profile=${profile.name} failed: ${result.error || 'Unknown error'}`;
          const diagnosticLine = `${lastError}${stderrInfo}`;
          diagnostics.push(diagnosticLine);
          this.logger.warn(`[Recording] ${diagnosticLine}`);
        }

        if (success) {
          break;
        }
      }

      if (success) {
        const outputBuffer = await fs.readFile(outputPath);
        this.logger.log(`[Recording] MP4 file created: ${outputBuffer.length} bytes`);
        return { buffer: outputBuffer, ffmpegAvailable: true, diagnostics, usedCommand };
      }

      return { buffer: null, error: lastError, ffmpegAvailable: false, diagnostics };
    } catch (e: any) {
      this.logger.error(`[Recording] Conversion error: ${e?.message}`);
      return {
        buffer: null,
        error: e?.message || 'Unknown ffmpeg conversion error',
        ffmpegAvailable: false,
        diagnostics: [e?.stack || e?.message || 'Unknown error'],
      };
    } finally {
      await fs.unlink(inputPath).catch(() => undefined);
      await fs.unlink(outputPath).catch(() => undefined);
    }
  }

  @Post('upload/:meetingId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB for video recordings
      },
    }),
  )
  async uploadRecording(
    @Param('meetingId') meetingId: string,
    @UploadedFile() file: any | undefined,
    @Body() body: any,
    @Request() req?: any,
  ) {
    if (!file) {
      throw new BadRequestException('No recording file uploaded');
    }

    const createdBy = body.createdBy || req?.user?.id;
    if (!createdBy) {
      throw new BadRequestException('createdBy is required');
    }

    const duration = parseInt(body.duration) || 0;

    // Determine team ID - always try to find a team, but allow personal folder fallback
    let teamId: string | null = null;
    let meetingTitle = 'Quick Huddle';
    let resolvedMeetingId: string | null = null;

    const isQuickHuddle = (meetingId || '').startsWith('quick-huddle');

    // Handle Quick Huddle or regular meeting
    if (isQuickHuddle) {
      // For Quick Huddle, create/find a personal recordings folder for this user
      // Do NOT use team's shared drive for Quick Huddle
      meetingTitle = 'Quick Huddle';
    } else {
      // Get meeting details
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { team: true, host: true },
      });

      if (!meeting) {
        // Meeting not found - try to use user's first team
        const userTeams = await this.prisma.teamMember.findFirst({
          where: { userId: createdBy },
          include: { team: true },
        });

        if (userTeams?.team) {
          teamId = userTeams.team.id;
          meetingTitle = 'Meeting Recording';
        } else {
          meetingTitle = 'Meeting Recording';
        }
      } else {
        resolvedMeetingId = meeting.id;
        teamId = meeting.teamId;
        meetingTitle = meeting.title || 'Meeting';

        if (!teamId) {
          // Meeting exists but no team - use user's first team
          const userTeams = await this.prisma.teamMember.findFirst({
            where: { userId: createdBy },
            include: { team: true },
          });

          if (userTeams?.team) {
            teamId = userTeams.team.id;
          }
        }
      }
    }

    // For Quick Huddle, always create/find a personal folder for this user
    // This ensures Quick Huddle recordings go to Personal, not Shared Drive
    if (isQuickHuddle && !teamId) {
      const user = await this.prisma.user.findUnique({
        where: { id: createdBy },
        select: { organizationId: true },
      });

      if (user?.organizationId) {
        // Find or create a personal recordings team for this user
        let personalTeam = await this.prisma.team.findFirst({
          where: {
            organizationId: user.organizationId,
            name: `Personal Recordings`,
          },
        });

        if (!personalTeam) {
          personalTeam = await this.prisma.team.create({
            data: {
              name: 'Personal Recordings',
              organizationId: user.organizationId,
            },
          });

          await this.prisma.teamMember.create({
            data: {
              teamId: personalTeam.id,
              userId: createdBy,
              role: 'admin',
            },
          });
        }

        teamId = personalTeam.id;
      }
    }

    // If no team found, create/find a personal folder for this user
    if (!teamId) {
      // Get user's organization
      const user = await this.prisma.user.findUnique({
        where: { id: createdBy },
        select: { organizationId: true },
      });

      if (user?.organizationId) {
        // Prefer an existing organization team so recordings are visible to teammates.
        const orgTeam = await this.prisma.team.findFirst({
          where: { organizationId: user.organizationId },
          orderBy: { createdAt: 'asc' },
        });
        if (orgTeam) {
          teamId = orgTeam.id;
        }
      }
    }

    // If still no team, create/find a fallback personal recordings team
    if (!teamId) {
      const user = await this.prisma.user.findUnique({
        where: { id: createdBy },
        select: { organizationId: true },
      });

      if (user?.organizationId) {
        let personalTeam = await this.prisma.team.findFirst({
          where: {
            organizationId: user.organizationId,
            name: 'Personal Recordings',
          },
        });

        if (!personalTeam) {
          // Create personal recordings team
          personalTeam = await this.prisma.team.create({
            data: {
              name: 'Personal Recordings',
              organizationId: user.organizationId,
            },
          });

          // Add user as member
          await this.prisma.teamMember.create({
            data: {
              teamId: personalTeam.id,
              userId: createdBy,
              role: 'admin',
            },
          });
        }

        teamId = personalTeam.id;
      } else {
        // Last resort - find any team in the system
        const anyTeam = await this.prisma.team.findFirst();
        if (anyTeam) {
          teamId = anyTeam.id;
        } else {
          throw new BadRequestException('No teams exist in the system');
        }
      }
    }

    // Generate stable date/time format for file naming
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS

    const sanitizedTitle = meetingTitle
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50);

    // Create parent folder "Meeting Recordings" if not exists
    const parentFolderName = 'Meeting Recordings';
    let parentFolder = await this.prisma.driveEntry.findFirst({
      where: {
        teamId,
        path: '/',
        name: parentFolderName,
        isFolder: true,
      },
    });

    if (!parentFolder) {
      try {
        parentFolder = await this.prisma.driveEntry.create({
          data: {
            teamId,
            createdById: createdBy,
            name: parentFolderName,
            path: '/',
            isFolder: true,
          },
        });
      } catch (e: any) {
        // Folder might have been created by another request
        parentFolder = await this.prisma.driveEntry.findFirst({
          where: {
            teamId,
            path: '/',
            name: parentFolderName,
            isFolder: true,
          },
        });
      }
    }

    // Create meeting-specific folder:
    // - Quick Huddle -> Personal (user-only recordings)
    // - Others -> meeting title
    const meetingFolderName = isQuickHuddle
      ? 'Personal'
      : sanitizedTitle || 'Meeting';
    const meetingFolderPath = `/${parentFolderName}`;

    let meetingFolder = await this.prisma.driveEntry.findFirst({
      where: {
        teamId,
        path: meetingFolderPath,
        name: meetingFolderName,
        isFolder: true,
      },
    });

    if (!meetingFolder) {
      try {
        meetingFolder = await this.prisma.driveEntry.create({
          data: {
            teamId,
            createdById: createdBy,
            name: meetingFolderName,
            path: meetingFolderPath,
            isFolder: true,
          },
        });
      } catch (e: any) {
        // Folder might have been created by another request
        meetingFolder = await this.prisma.driveEntry.findFirst({
          where: {
            teamId,
            path: meetingFolderPath,
            name: meetingFolderName,
            isFolder: true,
          },
        });
      }
    }

    // Standardize final output to mp4 when ffmpeg is available
    this.logger.log('[Recording] Starting MP4 conversion...');
    const conversion = await this.convertToMp4(file.buffer);
    const convertedMp4 = conversion.buffer;
    
    if (convertedMp4) {
      this.logger.log(`[Recording] Conversion successful: ${file.buffer.length} bytes -> ${convertedMp4.length} bytes (MP4)`);
    } else {
      this.logger.warn(`[Recording] Conversion failed, keeping original format. Error: ${conversion.error || 'Unknown'}`);
    }
    
    const finalBuffer = convertedMp4 || file.buffer;
    const fileExt = (file.originalname || '').split('.').pop()?.toLowerCase();
    const inferredSourceMime =
      fileExt === 'webm'
        ? 'video/webm'
        : fileExt === 'mp4'
          ? 'video/mp4'
          : file.mimetype;

    const finalMimetype = convertedMp4
      ? 'video/mp4'
      : inferredSourceMime && inferredSourceMime !== 'application/octet-stream'
        ? inferredSourceMime
        : 'video/webm';
    const finalName = `${dateStr}_${timeStr}${convertedMp4 ? '.mp4' : '.webm'}`;
    this.logger.log(`[Recording] Final file: ${finalName} (${finalMimetype}, ${finalBuffer.length} bytes)`);

    // Upload file to local storage directly (skip Cloudinary for speed)
    const storageFile: StorageUploadedFile = {
      fieldname: file.fieldname,
      originalname: finalName,
      encoding: file.encoding || '7bit',
      mimetype: finalMimetype,
      size: finalBuffer.length,
      buffer: finalBuffer,
      destination: file.destination,
      filename: file.filename,
      path: file.path,
    };

    // Force local storage for recordings to avoid timeout
    const storageFolder = `recordings/${teamId}/${meetingId}`;
    const uploadResult = await this.storageService['uploadToLocal'](
      storageFile,
      storageFolder,
    );

    // Save to Drive - this creates the file entry in the Shared Drive
    const filePath = `${meetingFolderPath}/${meetingFolderName}`;
    const driveResult = await this.driveService.saveFileVersion({
      teamId,
      createdById: createdBy,
      originalName: finalName,
      path: filePath,
      storageKey: uploadResult.key,
      size: uploadResult.size,
      mimeType: uploadResult.mimetype,
    });

    // Quick Huddle / unknown meeting ids are not persisted in meetings table.
    // Create a lightweight ended meeting session so recording metadata can keep FK integrity.
    if (!resolvedMeetingId) {
      const nowForMeeting = new Date();
      const meetingCode = `recording-${createdBy.slice(0, 8)}-${nowForMeeting.getTime()}-${Math.round(Math.random() * 1e6)}`;
      const recordingMeeting = await this.prisma.meeting.create({
        data: {
          title: isQuickHuddle
            ? `Quick Huddle Recording ${dateStr} ${timeStr}`
            : `${meetingTitle} Recording ${dateStr} ${timeStr}`,
          startTime: nowForMeeting,
          endTime: nowForMeeting,
          actualStartTime: nowForMeeting,
          actualEndTime: nowForMeeting,
          status: 'ended',
          allowScreenShare: true,
          meetingCode,
          teamId,
          hostId: createdBy,
        },
      });
      resolvedMeetingId = recordingMeeting.id;
    }

    // Save recording metadata
    const recording = await this.recordingsService.createRecording({
      meetingId: resolvedMeetingId,
      fileUrl: uploadResult.url,
      fileSize: uploadResult.size,
      duration: duration,
      createdBy: createdBy,
    });

    // Link recording to drive entry
    try {
      await this.prisma.meetingRecording.update({
        where: { id: recording.id },
        data: { driveEntryId: driveResult.entry.id },
      });
    } catch (e) {
      console.warn('Could not link recording to drive entry:', e);
    }

    // Log audit
    if (req?.user) {
      try {
        await this.auditService.log({
          action: 'upload',
          entity: 'meeting_recording',
          entityId: recording.id,
          userId: req.user.id,
          userName: req.user.name,
          details: {
            meetingId,
            meetingTitle: meetingTitle,
            fileName: finalName,
            fileSize: uploadResult.size,
            duration: duration,
            folder: meetingFolderName,
          },
        });
      } catch (e) {
        console.warn('Audit log failed:', e);
      }
    }

    return {
      success: true,
      recording: {
        id: recording.id,
        url: uploadResult.url,
        duration: duration,
        size: uploadResult.size,
      },
      drive: {
        entryId: driveResult.entry.id,
        name: driveResult.entry.name,
        path: driveResult.entry.path,
        folder: meetingFolderName,
        fullPath: filePath,
        teamId: teamId,
      },
      outputFormat: convertedMp4 ? 'mp4' : 'webm',
      message: convertedMp4
        ? undefined
        : conversion.error
          ? `FFmpeg conversion to mp4 failed: ${conversion.error}`
          : 'FFmpeg conversion failed, recording stored as WebM',
      conversionDiagnostics: conversion.diagnostics,
      ffmpegCommandUsed: conversion.usedCommand,
    };
  }
}
