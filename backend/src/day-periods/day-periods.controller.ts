import {
  Body,
  Controller,
  Delete,
  Get,
  GoneException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import {
  parseOptionalBooleanQuery,
  parseOptionalPositiveIntegerQuery,
  parseRequiredPositiveInteger,
} from '../common/query-validation';
import { DayPeriodsService } from './day-periods.service';

function parseOptionalCinemaId(value: unknown) {
  return parseOptionalPositiveIntegerQuery(
    value,
    'Biograf skal være et gyldigt ID',
  );
}

@Controller('day-periods')
export class DayPeriodsController {
  constructor(private dayPeriodsService: DayPeriodsService) {}

  @UseGuards(JwtGuard)
  @Get()
  findAll(
    @Req() req: any,
    @Query('includeArchived') includeArchived?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.dayPeriodsService.findAll(
      req.user,
      parseOptionalBooleanQuery(
        includeArchived,
        'includeArchived skal være true eller false',
      ),
      parseOptionalCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Post()
  create() {
    throw new GoneException({
      code: 'DAY_PERIOD_RETIRED',
      message: 'Dagsperioder er udfaset. Brug jobfunktioner i stedet.',
    });
  }

  @Patch(':id')
  update() {
    throw new GoneException({
      code: 'DAY_PERIOD_RETIRED',
      message: 'Dagsperioder er udfaset. Brug jobfunktioner i stedet.',
    });
  }

  @Delete(':id')
  remove() {
    throw new GoneException({
      code: 'DAY_PERIOD_RETIRED',
      message: 'Dagsperioder er udfaset. Brug jobfunktioner i stedet.',
    });
  }

  @Patch(':id/reactivate')
  reactivate() {
    throw new GoneException({
      code: 'DAY_PERIOD_RETIRED',
      message: 'Dagsperioder er udfaset. Brug jobfunktioner i stedet.',
    });
  }

}
