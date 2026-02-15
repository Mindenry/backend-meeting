import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RecordingsService } from './recordings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('recordings')
@UseGuards(JwtAuthGuard)
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @Post()
  createRecording(
    @Body()
    body: {
      meetingId: string;
      fileUrl: string;
      fileSize: number;
      duration: number;
      transcription?: string;
      createdBy: string;
    },
  ) {
    return this.recordingsService.createRecording(body);
  }

  @Get()
  getRecordings(@Query('meetingId') meetingId?: string) {
    return this.recordingsService.getRecordings(meetingId);
  }

  @Get(':id')
  getRecording(@Param('id') id: string) {
    return this.recordingsService.getRecording(id);
  }

  @Patch(':id')
  updateRecording(
    @Param('id') id: string,
    @Body() body: { transcription?: string; status?: string },
  ) {
    return this.recordingsService.updateRecording(id, body);
  }

  @Delete(':id')
  deleteRecording(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.recordingsService.deleteRecording(id, body.userId);
  }
}
