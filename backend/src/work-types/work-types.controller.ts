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
import { WorkTypesService } from './work-types.service';

@Controller('work-types')
export class WorkTypesController {
  constructor(private workTypesService: WorkTypesService) {}

  private parseCinemaId(cinemaId?: string) {
    return parseOptionalPositiveIntegerQuery(
      cinemaId,
      'Biograf skal være et gyldigt ID',
    );
  }

  private parseWorkTypeId(id: string) {
    return parseRequiredPositiveInteger(
      id,
      'Vagttype skal være et gyldigt ID',
    );
  }

  @UseGuards(JwtGuard)
  @Get()
  findAll(
    @Req() req,
    @Query('includeArchived') includeArchived?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.workTypesService.findAll(
      req.user,
      parseOptionalBooleanQuery(
        includeArchived,
        'Parameteren includeArchived skal være true eller false.',
      ),
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Post()
  create() {
    throw new GoneException({
      code: 'WORK_TYPE_RETIRED',
      message: 'Vagttyper er udfaset. Brug jobfunktioner i stedet.',
    });
  }

  @Patch(':id')
  update() {
    throw new GoneException({
      code: 'WORK_TYPE_RETIRED',
      message: 'Vagttyper er udfaset. Brug jobfunktioner i stedet.',
    });
  }

  @Delete(':id')
  remove() {
    throw new GoneException({
      code: 'WORK_TYPE_RETIRED',
      message: 'Vagttyper er udfaset. Brug jobfunktioner i stedet.',
    });
  }

  @Patch(':id/reactivate')
  reactivate() {
    throw new GoneException({
      code: 'WORK_TYPE_RETIRED',
      message: 'Vagttyper er udfaset. Brug jobfunktioner i stedet.',
    });
  }

}
