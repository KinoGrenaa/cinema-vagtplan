import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtGuard } from '../auth/jwt/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SystemErrorLogsService } from './system-error-logs.service';

function parseOptionalPositiveId(value: string | undefined, message: string) {
  if (value === undefined || value === '') {
    return undefined;
  }

  return parseRequiredPositiveId(value, message);
}

function parseRequiredPositiveId(value: string | number, message: string) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestException(message);
  }

  return id;
}

@UseGuards(JwtGuard, RolesGuard)
@Roles('MASTER')
@Controller('system-error-logs')
export class SystemErrorLogsController {
  constructor(private systemErrorLogsService: SystemErrorLogsService) {}

  @Get('retention-summary')
  getRetentionSummary() {
    return this.systemErrorLogsService.getRetentionSummary();
  }

  @Delete('retention-cleanup')
  cleanupRetention() {
    return this.systemErrorLogsService.cleanupRetention();
  }

  @Get()
  findAll(
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('cinemaId') cinemaId?: string,
    @Query('take') take?: string,
  ) {
    return this.systemErrorLogsService.findAll({
      severity,
      status,
      cinemaId: parseOptionalPositiveId(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
      take: parseOptionalPositiveId(take, 'Antal skal være et gyldigt tal'),
    });
  }

  @Patch(':id/seen')
  markSeen(@Param('id') id: string) {
    return this.systemErrorLogsService.updateStatus({
      id: parseRequiredPositiveId(id, 'Fejl-log skal være et gyldigt ID'),
      status: 'SEEN',
    });
  }

  @Patch(':id/resolve')
  resolve(
    @Req() req: any,
    @Param('id') id: string,
    @Body('note') note?: string,
  ) {
    return this.systemErrorLogsService.updateStatus({
      id: parseRequiredPositiveId(id, 'Fejl-log skal være et gyldigt ID'),
      status: 'RESOLVED',
      changedByUserId: parseRequiredPositiveId(
        req.user?.sub,
        'Bruger skal være et gyldigt ID',
      ),
      note,
    });
  }

  @Patch(':id/ignore')
  ignore(
    @Req() req: any,
    @Param('id') id: string,
    @Body('note') note?: string,
  ) {
    return this.systemErrorLogsService.updateStatus({
      id: parseRequiredPositiveId(id, 'Fejl-log skal være et gyldigt ID'),
      status: 'IGNORED',
      changedByUserId: parseRequiredPositiveId(
        req.user?.sub,
        'Bruger skal være et gyldigt ID',
      ),
      note,
    });
  }
}
