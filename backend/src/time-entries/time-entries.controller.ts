import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { TimeEntriesService } from './time-entries.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { RolesGuard } from '../auth/roles/roles.guard';

@Controller('time-entries')
export class TimeEntriesController {
  constructor(private timeEntriesService: TimeEntriesService) {}

  @UseGuards(JwtGuard, new RolesGuard(['ADMIN', 'MASTER']))
  @Get()
  getEntries(@Query('userId') userId?: string) {
    if (userId) {
      return this.timeEntriesService.findForUser(Number(userId));
    }

    return this.timeEntriesService.findAll();
  }

  @UseGuards(JwtGuard)
  @Get('open')
  getOpenEntry(@Query('userId') userId: string) {
    return this.timeEntriesService.findOpenEntry(Number(userId));
  }

  @UseGuards(JwtGuard)
  @Post('manual')
  submitManualEntry(
    @Body()
    body: {
      userId: number;
      cinemaId: number;
      shiftId: number;
      clockIn: string;
      clockOut: string;
      note?: string;
    },
  ) {
    return this.timeEntriesService.submitManualEntry(body);
  }

  @UseGuards(JwtGuard)
  @Post('clock-in')
  clockIn(
    @Body()
    body: {
      userId: number;
      cinemaId: number;
      shiftId?: number | null;
    },
  ) {
    return this.timeEntriesService.clockIn(body);
  }

  @UseGuards(JwtGuard)
  @Patch(':id/clock-out')
  clockOut(@Param('id') id: string) {
    return this.timeEntriesService.clockOut(Number(id));
  }

  @UseGuards(JwtGuard, new RolesGuard(['ADMIN', 'MASTER']))
  @Patch(':id/approve')
  approveEntry(@Param('id') id: string) {
    return this.timeEntriesService.approveEntry(Number(id));
  }

  @UseGuards(JwtGuard, new RolesGuard(['ADMIN', 'MASTER']))
  @Patch(':id/unapprove')
  unapproveEntry(@Param('id') id: string) {
    return this.timeEntriesService.unapproveEntry(Number(id));
  }

  @UseGuards(JwtGuard, new RolesGuard(['ADMIN', 'MASTER']))
  @Patch(':id/reject')
  rejectEntry(
    @Param('id') id: string,
    @Body()
    body: {
      adminNote?: string;
    },
  ) {
    return this.timeEntriesService.rejectEntry(Number(id), body.adminNote);
  }

  @UseGuards(JwtGuard, new RolesGuard(['ADMIN', 'MASTER']))
  @Patch(':id')
  updateEntry(
    @Param('id') id: string,
    @Body()
    body: {
      clockIn: string;
      clockOut?: string | null;
      adminNote?: string;
    },
  ) {
    return this.timeEntriesService.updateEntry(Number(id), body);
  }
}
