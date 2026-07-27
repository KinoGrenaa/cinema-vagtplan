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
  MyShiftsService,
} from './my-shifts.service';

@Controller('shifts')
export class MyShiftsController {
  constructor(
    private readonly myShiftsService:
      MyShiftsService,
  ) {}

  @UseGuards(JwtGuard)
  @Get('my-month')
  findMonth(
    @Req() req: any,
    @Query('month')
    month?: string,
    @Query('cinemaId')
    cinemaId?: string,
    @Query('targetId')
    targetId?: string,
  ) {
    return this.myShiftsService.findMonth(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
      {
        month,
        targetId:
          parseOptionalPositiveIntegerQuery(
            targetId,
            'Målrettet vagt skal være et gyldigt ID',
          ),
      },
    );
  }

  @UseGuards(JwtGuard)
  @Get('my-static-data')
  findStaticData(
    @Req() req: any,
    @Query('cinemaId')
    cinemaId?: string,
  ) {
    return this.myShiftsService.findStaticData(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }
}
