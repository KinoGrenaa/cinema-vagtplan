import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import {
  parseOptionalPositiveIntegerQuery,
  parseRequiredIntegerInRange,
} from '../common/query-validation';
import {
  normalizeMonthPlanDate,
} from './helpers/month-plan-service-helpers';
import { MonthPlansService } from './month-plans.service';

function parseYear(value: unknown) {
  return String(
    parseRequiredIntegerInRange(
      value,
      2000,
      2100,
      'År skal være et gyldigt tal.',
    ),
  );
}

function parseMonth(value: unknown) {
  return String(
    parseRequiredIntegerInRange(
      value,
      1,
      12,
      'Måned skal være et gyldigt tal fra 1 til 12.',
    ),
  );
}

function parseOptionalCinemaId(value: unknown) {
  const cinemaId = parseOptionalPositiveIntegerQuery(
    value,
    'Biograf skal være et gyldigt ID.',
  );

  return cinemaId === undefined ? undefined : String(cinemaId);
}

function parseRequiredDate(value: string) {
  normalizeMonthPlanDate(value);
  return value;
}

@Controller('month-plans')
export class MonthPlansController {
  constructor(private monthPlansService: MonthPlansService) {}

  @UseGuards(JwtGuard)
  @Get()
  findMonth(
    @Req() req: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.monthPlansService.findMonth(
      req.user,
      parseYear(year),
      parseMonth(month),
      parseOptionalCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Get('days/:date')
  findDay(
    @Req() req: any,
    @Param('date') date: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.monthPlansService.findDay(
      req.user,
      parseRequiredDate(date),
      parseOptionalCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Patch('days/:date')
  upsertDay(
    @Req() req: any,
    @Param('date') date: string,
    @Body() body: unknown,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.monthPlansService.upsertDay(
      req.user,
      parseRequiredDate(date),
      body,
      parseOptionalCinemaId(cinemaId),
    );
  }
}
