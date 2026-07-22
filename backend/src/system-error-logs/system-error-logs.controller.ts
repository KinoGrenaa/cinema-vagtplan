import {
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
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  parseOptionalPositiveIntegerQuery,
  parseRequiredPositiveInteger,
} from '../common/query-validation';
import {
  normalizeSystemErrorResolutionNote,
  normalizeSystemErrorSeverity,
  normalizeSystemErrorStatus,
} from './system-error-log-input';
import { SystemErrorLogsService } from './system-error-logs.service';

@UseGuards(JwtGuard, RolesGuard)
@Roles('MASTER')
@Controller('system-error-logs')
export class SystemErrorLogsController {
  constructor(
    private systemErrorLogsService:
      SystemErrorLogsService,
  ) {}

  @Get()
  findAll(
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('cinemaId') cinemaId?: string,
    @Query('take') take?: string,
  ) {
    return this.systemErrorLogsService.findAll({
      severity:
        normalizeSystemErrorSeverity(
          severity,
        ),
      status:
        normalizeSystemErrorStatus(
          status,
        ),
      cinemaId:
        parseOptionalPositiveIntegerQuery(
          cinemaId,
          'Biograf skal være et gyldigt ID',
        ),
      take:
        parseOptionalPositiveIntegerQuery(
          take,
          'Antal skal være et gyldigt tal',
        ),
    });
  }

  @Get('retention-summary')
  getRetentionSummary() {
    return this.systemErrorLogsService
      .getRetentionSummary();
  }

  @Delete('retention-cleanup')
  cleanupRetention() {
    return this.systemErrorLogsService
      .cleanupRetention();
  }

  @Patch(':id/seen')
  markSeen(
    @Param('id') id: string,
  ) {
    return this.systemErrorLogsService.updateStatus({
      id: parseRequiredPositiveInteger(
        id,
        'Fejl-log skal være et gyldigt ID',
      ),
      status: 'SEEN',
    });
  }

  @Patch(':id/resolve')
  resolve(
    @Req() req: any,
    @Param('id') id: string,
    @Body('note') note?: unknown,
  ) {
    return this.systemErrorLogsService.updateStatus({
      id: parseRequiredPositiveInteger(
        id,
        'Fejl-log skal være et gyldigt ID',
      ),
      status: 'RESOLVED',
      changedByUserId:
        parseRequiredPositiveInteger(
          req.user?.sub,
          'Bruger skal være et gyldigt ID',
        ),
      note:
        normalizeSystemErrorResolutionNote(
          note,
        ),
    });
  }

  @Patch(':id/ignore')
  ignore(
    @Req() req: any,
    @Param('id') id: string,
    @Body('note') note?: unknown,
  ) {
    return this.systemErrorLogsService.updateStatus({
      id: parseRequiredPositiveInteger(
        id,
        'Fejl-log skal være et gyldigt ID',
      ),
      status: 'IGNORED',
      changedByUserId:
        parseRequiredPositiveInteger(
          req.user?.sub,
          'Bruger skal være et gyldigt ID',
        ),
      note:
        normalizeSystemErrorResolutionNote(
          note,
        ),
    });
  }
}
