import {
  BadRequestException,
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

  private parseOptionalId(value: string | undefined, message: string) {
    if (!value) {
      return undefined;
    }

    return this.parseRequiredId(value, message);
  }

  private parseRequiredId(value: string, message: string) {
    const parsedId = Number(value);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new BadRequestException(message);
    }

    return parsedId;
  }

  @UseGuards(JwtGuard)
  @Get('me')
  getMyEntries(@Req() req) {
    return this.timeEntriesService.findForUser(req.user.sub, req.user);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Get()
  getEntries(
    @Req() req,
    @Query('userId') userId?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    const selectedCinemaId = this.parseOptionalId(
      cinemaId,
      'Biograf skal være et gyldigt ID',
    );

    if (userId) {
      return this.timeEntriesService.findForUser(
        this.parseRequiredId(userId, 'Bruger skal være et gyldigt ID'),
        req.user,
        selectedCinemaId,
      );
    }

    return this.timeEntriesService.findAll(req.user, selectedCinemaId);
  }

  @UseGuards(JwtGuard)
  @Get('open')
  getOpenEntry(
    @Req() req,
    @Query('userId') userId?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.timeEntriesService.findOpenEntry(
      req.user,
      this.parseOptionalId(userId, 'Bruger skal være et gyldigt ID'),
      this.parseOptionalId(cinemaId, 'Biograf skal være et gyldigt ID'),
    );
  }

  @UseGuards(JwtGuard)
  @Post('manual')
  submitManualEntry(@Req() req, @Body() body: ManualTimeEntryDto) {
    return this.timeEntriesService.submitManualEntry(req.user, body);
  }

  @UseGuards(JwtGuard)
  @Post('clock-in')
  clockIn(
    @Req() req,
    @Body()
    body: {
      userId?: number;
      cinemaId?: number;
      shiftId?: number | null;
      clockIn?: string;
      note?: string;
      clockInNote?: string;
    },
  ) {
    return this.timeEntriesService.clockIn(req.user, body);
  }

  @UseGuards(JwtGuard)
  @Patch(':id/clock-out')
  clockOut(
    @Req() req,
    @Param('id') id: string,
    @Body()
    body: {
      clockOut?: string;
      note?: string;
      clockOutNote?: string;
    },
  ) {
    return this.timeEntriesService.clockOut(
      req.user,
      this.parseRequiredId(id, 'Tidsregistrering skal være et gyldigt ID'),
      body,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id/approve')
  approveEntry(
    @Req() req,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
    @Body()
    body?: {
      confirmPayrollAdjustment?: boolean;
    },
  ) {
    const selectedCinemaId = this.parseOptionalId(
      cinemaId,
      'Biograf skal være et gyldigt ID',
    );

    return this.timeEntriesService.approveEntry(
      this.parseRequiredId(id, 'Tidsregistrering skal være et gyldigt ID'),
      req.user,
      selectedCinemaId,
      body?.confirmPayrollAdjustment ?? false,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id/unapprove')
  unapproveEntry(
    @Req() req,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
    @Body()
    body?: {
      confirmPayrollAdjustment?: boolean;
    },
  ) {
    const selectedCinemaId = this.parseOptionalId(
      cinemaId,
      'Biograf skal være et gyldigt ID',
    );

    return this.timeEntriesService.unapproveEntry(
      this.parseRequiredId(id, 'Tidsregistrering skal være et gyldigt ID'),
      req.user,
      selectedCinemaId,
      body?.confirmPayrollAdjustment ?? false,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id/reject')
  rejectEntry(
    @Req() req,
    @Param('id') id: string,
    @Body() body: RejectTimeEntryDto,
    @Query('cinemaId') cinemaId?: string,
  ) {
    const selectedCinemaId = this.parseOptionalId(
      cinemaId,
      'Biograf skal være et gyldigt ID',
    );

    return this.timeEntriesService.rejectEntry(
      this.parseRequiredId(id, 'Tidsregistrering skal være et gyldigt ID'),
      body.adminNote,
      req.user,
      selectedCinemaId,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id/void')
  voidEntry(
    @Req() req,
    @Param('id') id: string,
    @Body()
    body: RejectTimeEntryDto & {
      confirmPayrollAdjustment?: boolean;
    },
    @Query('cinemaId') cinemaId?: string,
  ) {
    const selectedCinemaId = this.parseOptionalId(
      cinemaId,
      'Biograf skal være et gyldigt ID',
    );

    return this.timeEntriesService.voidEntry(
      this.parseRequiredId(id, 'Tidsregistrering skal være et gyldigt ID'),
      body.adminNote,
      req.user,
      selectedCinemaId,
      body.confirmPayrollAdjustment ?? false,
    );
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
    return this.timeEntriesService.updateOwnEntry(
      req.user,
      this.parseRequiredId(id, 'Tidsregistrering skal være et gyldigt ID'),
      body,
    );
  }

  @UseGuards(JwtGuard)
  @Get(':id/revisions')
  getEntryRevisions(
    @Req() req,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    const selectedCinemaId = this.parseOptionalId(
      cinemaId,
      'Biograf skal være et gyldigt ID',
    );

    return this.timeEntriesService.findRevisionsForEntry(
      req.user,
      this.parseRequiredId(id, 'Tidsregistrering skal være et gyldigt ID'),
      selectedCinemaId,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id')
  updateEntry(
    @Req() req,
    @Param('id') id: string,
    @Body() body: UpdateTimeEntryDto,
    @Query('cinemaId') cinemaId?: string,
  ) {
    const selectedCinemaId = this.parseOptionalId(
      cinemaId,
      'Biograf skal være et gyldigt ID',
    );

    return this.timeEntriesService.updateEntry(
      req.user,
      this.parseRequiredId(id, 'Tidsregistrering skal være et gyldigt ID'),
      body,
      selectedCinemaId,
    );
  }
}
