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

@Controller('shifts')
export class ShiftsController {
  constructor(private shiftsService: ShiftsService) {}

  @UseGuards(JwtGuard)
  @Get()
  getAllShifts(@Query('date') date?: string) {
    return this.shiftsService.findAll(date);
  }

  @UseGuards(JwtGuard)
  @UseGuards(JwtGuard, new RolesGuard(['ADMIN', 'MASTER']))
  @Post()
  createShift(
    @Body()
    body: {
      startTime: string;
      endTime: string;
      note?: string;
      cinemaId: number;
      userId: number;
      workTypeId: number;
    },
  ) {
    return this.shiftsService.createShift(body);
  }

  @UseGuards(JwtGuard)
  @UseGuards(JwtGuard, new RolesGuard(['ADMIN', 'MASTER']))
  @Patch(':id')
  updateShift(
    @Param('id') id: string,
    @Body()
    body: {
      startTime: string;
      endTime: string;
      note?: string;
      userId: number;
      workTypeId: number;
    },
  ) {
    return this.shiftsService.updateShift(Number(id), body);
  }

  @UseGuards(JwtGuard)
  @UseGuards(JwtGuard, new RolesGuard(['ADMIN', 'MASTER']))
  @Delete(':id')
  deleteShift(@Param('id') id: string) {
    return this.shiftsService.deleteShift(Number(id));
  }
}
