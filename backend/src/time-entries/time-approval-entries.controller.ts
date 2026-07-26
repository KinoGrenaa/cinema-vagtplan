import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import {
  findTimeApprovalPeriodEntries,
} from './helpers/time-approval-period-entries';

@Controller('time-entries')
export class TimeApprovalEntriesController {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Get('approval-period')
  getApprovalPeriodEntries(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    const selectedCinemaId = cinemaId
      ? Number(cinemaId)
      : undefined;

    if (
      selectedCinemaId !== undefined &&
      (!Number.isInteger(selectedCinemaId) || selectedCinemaId <= 0)
    ) {
      throw new BadRequestException(
        'Biograf skal være et gyldigt ID',
      );
    }

    return findTimeApprovalPeriodEntries(
      this.prisma,
      req.user,
      selectedCinemaId,
      {
        startDate,
        endDate,
      },
    );
  }
}
