import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtGuard } from '../auth/jwt/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import {
  findMyTimePeriodEntries,
} from './helpers/my-time-period-entries';

@Controller('time-entries')
export class MyTimeEntriesController {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  @UseGuards(JwtGuard)
  @Get('me-period')
  getMyPeriodEntries(
    @Req() req: any,
    @Query('startDate')
    startDate?: string,
    @Query('endDate')
    endDate?: string,
  ) {
    return findMyTimePeriodEntries(
      this.prisma,
      req.user,
      {
        startDate,
        endDate,
      },
    );
  }
}
