import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CinemasService } from './cinemas.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { hasPermission } from '../auth/permissions';

type AuthUser = {
  sub: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
  canManageCinemaSettings?: boolean;
};

type CreateCinemaBody = {
  name?: string;
};

type UpdateCinemaSettingsBody = {
  name?: string;
  allowShiftTradePool?: boolean;
  allowShiftTradeDirect?: boolean;
  aiEnabled?: boolean;
  payrollRulesEnabled?: boolean;
  clockInDeviationToleranceMinutes?: number;
  clockOutDeviationToleranceMinutes?: number;
  requireNoteForClockInDeviation?: boolean;
  requireNoteForClockOutDeviation?: boolean;
  requireNoteForManualEntry?: boolean;
  payrollOvertimeEnabled?: boolean;
  plannedOvertimeEnabled?: boolean;
  dailyOvertimeEnabled?: boolean;
  weeklyOvertimeEnabled?: boolean;
  dailyOvertimeThreshold?: number;
  weeklyOvertimeThreshold?: number;
  payrollPeriodModel?: 'CALENDAR_MONTH' | 'FIXED_DAY_TO_DAY' | 'BIWEEKLY';
  payrollPeriodStartDay?: number;
  payrollPeriodEndDay?: number;
  payrollPeriodAnchorDate?: string | null;
  payrollPayoutRule?: 'LAST_WEEKDAY_OF_MONTH' | 'FIXED_DAY_OF_MONTH';
  payrollPayoutDay?: number;
};

@Controller('cinemas')
export class CinemasController {
  constructor(private cinemasService: CinemasService) {}

  private parseCinemaId(id: string) {
    const cinemaId = Number(id);

    if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
      throw new BadRequestException('Ugyldigt biograf-id');
    }

    return cinemaId;
  }

  private ensureMaster(user: AuthUser) {
    if (user.role !== 'MASTER') {
      throw new ForbiddenException('Kun MASTER har adgang til denne handling');
    }
  }

  @UseGuards(JwtGuard)
  @Get()
  findAll(@Req() req: any) {
    const user = req.user as AuthUser;
    this.ensureMaster(user);

    return this.cinemasService.findAll();
  }

  @UseGuards(JwtGuard)
  @Post()
  create(@Body() body: CreateCinemaBody, @Req() req: any) {
    const user = req.user as AuthUser;
    this.ensureMaster(user);

    return this.cinemasService.create({ name: body.name });
  }

  @UseGuards(JwtGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const user = req.user as AuthUser;
    const cinemaId = this.parseCinemaId(id);

    if (
      user.role !== 'MASTER' &&
      (!user.cinemaId || user.cinemaId !== cinemaId)
    ) {
      throw new ForbiddenException('Du har ikke adgang til denne biograf');
    }

    return this.cinemasService.findOne(cinemaId);
  }

  @UseGuards(JwtGuard)
  @Patch(':id')
  updateSettings(
    @Param('id') id: string,
    @Body() body: UpdateCinemaSettingsBody,
    @Req() req: any,
  ) {
    const user = req.user as AuthUser;
    const cinemaId = this.parseCinemaId(id);

    if (
      user.role !== 'MASTER' &&
      (!user.cinemaId || user.cinemaId !== cinemaId)
    ) {
      throw new ForbiddenException('Du har ikke adgang til denne biograf');
    }

    if (body.name !== undefined && user.role !== 'MASTER') {
      throw new ForbiddenException('Kun MASTER kan ændre biografens navn');
    }

    if (
      user.role !== 'MASTER' &&
      user.role !== 'ADMIN' &&
      !hasPermission(user, 'canManageCinemaSettings')
    ) {
      throw new ForbiddenException(
        'Du har ikke rettighed til at ændre biografindstillinger',
      );
    }

    return this.cinemasService.updateSettings(cinemaId, {
      ...body,
      payrollPeriodAnchorDate:
        body.payrollPeriodAnchorDate !== undefined
          ? body.payrollPeriodAnchorDate
            ? new Date(body.payrollPeriodAnchorDate)
            : null
          : undefined,
    });
  }
}
