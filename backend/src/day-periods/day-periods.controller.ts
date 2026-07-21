import {
  Body,
  Controller,
  Delete,
  Get,
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
  create(@Req() req: any, @Body() body: unknown) {
    return this.dayPeriodsService.create(req.user, body as any);
  }

  @UseGuards(JwtGuard)
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: unknown,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.dayPeriodsService.update(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Dagsperiode skal være et gyldigt ID',
      ),
      body as any,
      parseOptionalCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  remove(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.dayPeriodsService.remove(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Dagsperiode skal være et gyldigt ID',
      ),
      parseOptionalCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/reactivate')
  reactivate(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.dayPeriodsService.reactivate(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Dagsperiode skal være et gyldigt ID',
      ),
      parseOptionalCinemaId(cinemaId),
    );
  }
}
