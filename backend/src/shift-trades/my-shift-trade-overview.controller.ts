import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  JwtGuard,
} from '../auth/jwt/jwt.guard';
import {
  parseOptionalPositiveIntegerQuery,
} from '../common/query-validation';
import {
  MyShiftTradeOverviewService,
} from './my-shift-trade-overview.service';

@Controller('shift-trades')
@UseGuards(JwtGuard)
export class MyShiftTradeOverviewController {
  constructor(
    private readonly service:
      MyShiftTradeOverviewService,
  ) {}

  @Get('my-shifts-overview')
  findOverview(
    @Req() req: any,
    @Query('month')
    month?: string,
    @Query('cinemaId')
    cinemaId?: string,
  ) {
    return this.service.findOverview(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
      month,
    );
  }
}
