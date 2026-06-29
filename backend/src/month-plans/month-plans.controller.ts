import {
  BadRequestException,
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
import { MonthPlansService } from './month-plans.service';

@Controller('month-plans')
export class MonthPlansController {
  constructor(private monthPlansService: MonthPlansService) {}

  private parseRequiredDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('Dato skal angives som ÅÅÅÅ-MM-DD.');
    }

    return value;
  }

  @UseGuards(JwtGuard)
  @Get()
  findMonth(
    @Req() req,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.monthPlansService.findMonth(req.user, year, month, cinemaId);
  }

  @UseGuards(JwtGuard)
  @Get('days/:date')
  findDay(
    @Req() req,
    @Param('date') date: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.monthPlansService.findDay(
      req.user,
      this.parseRequiredDate(date),
      cinemaId,
    );
  }

  @UseGuards(JwtGuard)
  @Patch('days/:date')
  upsertDay(
    @Req() req,
    @Param('date') date: string,
    @Body() body,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.monthPlansService.upsertDay(
      req.user,
      this.parseRequiredDate(date),
      body,
      cinemaId,
    );
  }
}
