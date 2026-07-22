import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  normalizeAuditEntityType,
  parseAuditEntityId,
  parseOptionalAuditCinemaId,
} from './helpers/audit-log-controller-input';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Get()
  getAuditLogs(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.auditLogsService.findAll(
      req.user,
      parseOptionalAuditCinemaId(
        cinemaId,
      ),
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Get('entity/:entityType/:entityId')
  getEntityHistory(
    @Req() req: any,
    @Param('entityType')
    entityType: string,
    @Param('entityId')
    entityId: string,
    @Query('cinemaId')
    cinemaId?: string,
  ) {
    return this.auditLogsService.findByEntity(
      req.user,
      normalizeAuditEntityType(
        entityType,
      ),
      parseAuditEntityId(entityId),
      parseOptionalAuditCinemaId(
        cinemaId,
      ),
    );
  }
}
