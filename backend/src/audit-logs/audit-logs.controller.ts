import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private auditLogsService: AuditLogsService) {}

  private parseOptionalId(value: string | undefined, message: string) {
    if (value === undefined || value === '') {
      return undefined;
    }

    return this.parseRequiredId(value, message);
  }

  private parseRequiredId(value: string | number, message: string) {
    const parsedId = Number(value);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new BadRequestException(message);
    }

    return parsedId;
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Get()
  getAuditLogs(@Req() req: any, @Query('cinemaId') cinemaId?: string) {
    const selectedCinemaId = this.parseOptionalId(
      cinemaId,
      'Biograf skal være et gyldigt ID',
    );

    return this.auditLogsService.findAll(req.user, selectedCinemaId);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Get('entity/:entityType/:entityId')
  getEntityHistory(
    @Req() req: any,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    const selectedCinemaId = this.parseOptionalId(
      cinemaId,
      'Biograf skal være et gyldigt ID',
    );

    return this.auditLogsService.findByEntity(
      req.user,
      entityType,
      this.parseRequiredId(entityId, 'Entitet skal være et gyldigt ID'),
      selectedCinemaId,
    );
  }
}
