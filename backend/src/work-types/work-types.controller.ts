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
  create(@Req() req, @Body() body) {
    return this.workTypesService.create(req.user, body);
  }

  @UseGuards(JwtGuard)
  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() body,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.workTypesService.update(
      req.user,
      this.parseWorkTypeId(id),
      body,
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  remove(
    @Req() req,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.workTypesService.remove(
      req.user,
      this.parseWorkTypeId(id),
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/reactivate')
  reactivate(
    @Req() req,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.workTypesService.reactivate(
      req.user,
      this.parseWorkTypeId(id),
      this.parseCinemaId(cinemaId),
    );
  }
}
