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

import { WorkTypesService } from './work-types.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';

@Controller('work-types')
export class WorkTypesController {
  constructor(private workTypesService: WorkTypesService) {}

  @UseGuards(JwtGuard)
  @Get()
  findAll(@Req() req, @Query('includeArchived') includeArchived?: string) {
    return this.workTypesService.findAll(req.user, includeArchived === 'true');
  }

  @UseGuards(JwtGuard)
  @Post()
  create(@Req() req, @Body() body) {
    return this.workTypesService.create(req.user, body);
  }

  @UseGuards(JwtGuard)
  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() body) {
    return this.workTypesService.update(req.user, Number(id), body);
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.workTypesService.remove(req.user, Number(id));
  }

  @UseGuards(JwtGuard)
  @Patch(':id/reactivate')
  reactivate(@Req() req, @Param('id') id: string) {
    return this.workTypesService.reactivate(req.user, Number(id));
  }
}
