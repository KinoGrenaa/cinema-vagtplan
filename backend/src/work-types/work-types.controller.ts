import { Controller, Get, UseGuards } from '@nestjs/common';
import { WorkTypesService } from './work-types.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';

@Controller('work-types')
export class WorkTypesController {
  constructor(private workTypesService: WorkTypesService) {}

  @UseGuards(JwtGuard)
  @Get()
  getAllWorkTypes() {
    return this.workTypesService.findAll();
  }
}