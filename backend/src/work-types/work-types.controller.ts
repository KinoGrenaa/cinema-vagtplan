import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { WorkTypesService } from './work-types.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';

@Controller('work-types')
export class WorkTypesController {
  constructor(private workTypesService: WorkTypesService) {}

  @UseGuards(JwtGuard)
  @Get()
  findAll(@Req() req) {
    return this.workTypesService.findAll(req.user);
  }
}
