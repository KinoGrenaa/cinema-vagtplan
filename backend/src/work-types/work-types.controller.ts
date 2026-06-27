import {
  BadRequestException,
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

import { WorkTypesService } from './work-types.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';

@Controller('work-types')
export class WorkTypesController {
  constructor(private workTypesService: WorkTypesService) {}

  private parseRequiredId(value: string | number, message: string) {
    const parsedId = Number(value);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new BadRequestException(message);
    }

    return parsedId;
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
      includeArchived === 'true',
      cinemaId,
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
      this.parseRequiredId(id, 'Vagttype skal være et gyldigt ID'),
      body,
      cinemaId,
    );
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string, @Query('cinemaId') cinemaId?: string) {
    return this.workTypesService.remove(
      req.user,
      this.parseRequiredId(id, 'Vagttype skal være et gyldigt ID'),
      cinemaId,
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
      this.parseRequiredId(id, 'Vagttype skal være et gyldigt ID'),
      cinemaId,
    );
  }
}
