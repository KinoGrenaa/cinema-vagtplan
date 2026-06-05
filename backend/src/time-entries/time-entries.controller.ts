import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { TimeEntriesService } from './time-entries.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

import { ManualTimeEntryDto } from './dto/manual-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { RejectTimeEntryDto } from './dto/reject-time-entry.dto';

@Controller('time-entries')
export class TimeEntriesController {
  constructor(private timeEntriesService: TimeEntriesService) {}

  @UseGuards(JwtGuard)
  @Get('me')
  getMyEntries(@Req() req) {
    return this.timeEntriesService.findForUser(req.user.sub);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
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
  submitManualEntry(@Body() body: ManualTimeEntryDto) {
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

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id/approve')
  approveEntry(@Param('id') id: string) {
    return this.timeEntriesService.approveEntry(Number(id));
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id/unapprove')
  unapproveEntry(@Param('id') id: string) {
    return this.timeEntriesService.unapproveEntry(Number(id));
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id/reject')
  rejectEntry(@Param('id') id: string, @Body() body: RejectTimeEntryDto) {
    return this.timeEntriesService.rejectEntry(Number(id), body.adminNote);
  }

  @UseGuards(JwtGuard)
  @Patch('me/:id')
  updateMyEntry(
    @Req() req,
    @Param('id') id: string,
    @Body()
    body: {
      clockIn: string;
      clockOut?: string | null;
      note?: string | null;
    },
  ) {
    return this.timeEntriesService.updateOwnEntry(req.user, Number(id), body);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id')
  updateEntry(
    @Req() req,
    @Param('id') id: string,
    @Body() body: UpdateTimeEntryDto,
  ) {
    return this.timeEntriesService.updateEntry(req.user, Number(id), body);
  }
}
