import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
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
  cinemaId: number;
  canManageCinemaSettings?: boolean;
};

type UpdateCinemaSettingsBody = {
  allowShiftTradePool?: boolean;
  allowShiftTradeDirect?: boolean;

  aiEnabled?: boolean;

  payrollRulesEnabled?: boolean;
  payrollOvertimeEnabled?: boolean;
  plannedOvertimeEnabled?: boolean;
  dailyOvertimeEnabled?: boolean;
  weeklyOvertimeEnabled?: boolean;
  dailyOvertimeThreshold?: number;
  weeklyOvertimeThreshold?: number;
};

@Controller('cinemas')
export class CinemasController {
  constructor(private cinemasService: CinemasService) {}

  @UseGuards(JwtGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const user = req.user as AuthUser;
    const cinemaId = Number(id);

    if (user.role !== 'MASTER' && user.cinemaId !== cinemaId) {
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
    const cinemaId = Number(id);

    if (user.role !== 'MASTER' && user.cinemaId !== cinemaId) {
      throw new ForbiddenException('Du har ikke adgang til denne biograf');
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

    return this.cinemasService.updateSettings(cinemaId, body);
  }
}
