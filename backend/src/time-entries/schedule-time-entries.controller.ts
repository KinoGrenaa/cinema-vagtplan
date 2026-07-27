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
  getCopenhagenDayRange,
} from '../shifts/helpers/shift-service-helpers';
import {
  ScheduleTimeEntriesService,
} from './schedule-time-entries.service';

@Controller('time-entries')
@UseGuards(JwtGuard)
export class ScheduleTimeEntriesController {
  constructor(
    private readonly service:
      ScheduleTimeEntriesService,
  ) {}

  @Get('schedule-day')
  findForDay(
    @Req() req: any,
    @Query('date')
    date?: string,
    @Query('cinemaId')
    cinemaId?: string,
  ) {
    getCopenhagenDayRange(
      date ?? '',
    );

    return this.service.findForDay(
      req.user,
      date!,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }
}
