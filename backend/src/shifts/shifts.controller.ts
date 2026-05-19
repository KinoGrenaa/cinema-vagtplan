import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { RolesGuard } from '../auth/roles/roles.guard';
import { ShiftsService } from './shifts.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

@Controller('shifts')
export class ShiftsController {
  constructor(private shiftsService: ShiftsService) {}

  @UseGuards(JwtGuard)
  @Get()
  getAllShifts(@Query('date') date?: string) {
    return this.shiftsService.findAll(date);
  }

  @UseGuards(JwtGuard, new RolesGuard(['ADMIN', 'MASTER']))
  @Post()
  createShift(@Body() body: CreateShiftDto) {
    return this.shiftsService.createShift(body);
  }

  @UseGuards(JwtGuard, new RolesGuard(['ADMIN', 'MASTER']))
  @Patch(':id')
  updateShift(
    @Param('id') id: string,
    @Body() body: UpdateShiftDto,
  ) {
    return this.shiftsService.updateShift(Number(id), body);
  }

  @UseGuards(JwtGuard, new RolesGuard(['ADMIN', 'MASTER']))
  @Delete(':id')
  deleteShift(@Param('id') id: string) {
    return this.shiftsService.deleteShift(Number(id));
  }
}