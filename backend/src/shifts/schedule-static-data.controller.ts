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
  ScheduleStaticDataService,
} from './schedule-static-data.service';

@Controller('shifts')
export class ScheduleStaticDataController {
  constructor(
    private readonly service:
      ScheduleStaticDataService,
  ) {}

  @UseGuards(JwtGuard)
  @Get('schedule-static-data')
  findData(
    @Req() req: any,
    @Query('cinemaId')
    cinemaId?: string,
  ) {
    return this.service.findData(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }
}
