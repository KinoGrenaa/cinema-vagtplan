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
  getCopenhagenDateStart,
} from './helpers/leave-request-page';
import {
  ScheduleLeaveRequestsService,
} from './schedule-leave-requests.service';

@Controller('leave-requests')
export class ScheduleLeaveRequestsController {
  constructor(
    private readonly service:
      ScheduleLeaveRequestsService,
  ) {}

  @UseGuards(JwtGuard)
  @Get('schedule-day')
  findForDay(
    @Req() req: any,
    @Query('date')
    date?: string,
    @Query('cinemaId')
    cinemaId?: string,
  ) {
    // Reuse the established validation and
    // Europe/Copenhagen date semantics.
    getCopenhagenDateStart(
      date ?? '',
    );

    return this.service.findForDay(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
      date!,
    );
  }
}
