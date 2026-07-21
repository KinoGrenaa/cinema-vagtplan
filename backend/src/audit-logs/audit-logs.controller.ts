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
import {
  parseOptionalPositiveIntegerQuery,
  parseRequiredPositiveInteger,
} from '../common/query-validation';
import { AuditLogsService } from './audit-logs.service';

function parseAuditEntityType(value: unknown) {
  if (typeof value !== 'string') {
    throw new BadRequestException('Entitetstype skal være gyldig');
  }

  const entityType = value.trim();

  if (
    entityType.length === 0 ||
    entityType.length > 100 ||
    /[\u0000-\u001f\u007f]/.test(entityType)
  ) {
    throw new BadRequestException('Entitetstype skal være gyldig');
  }

  return entityType;
}

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private auditLogsService: AuditLogsService) {}

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Get()
  getAuditLogs(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.auditLogsService.findAll(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
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
    return this.auditLogsService.findByEntity(
      req.user,
      parseAuditEntityType(entityType),
      parseRequiredPositiveInteger(
        entityId,
        'Entitet skal være et gyldigt ID',
      ),
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }
}
