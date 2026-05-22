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
import { ShiftsService } from './shifts.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { Roles } from '../auth/roles/roles.decorator';

@Controller('shifts')
export class ShiftsController {
  constructor(private shiftsService: ShiftsService) {}

  @UseGuards(JwtGuard)
  @Get()
  getAllShifts(@Req() req: any, @Query('date') date?: string) {
    return this.shiftsService.findAll(req.user as any, date);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Post()
  createShift(@Req() req: any, @Body() body: CreateShiftDto) {
    return this.shiftsService.createShift(req.user as any, body);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id')
  updateShift(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateShiftDto,
  ) {
    return this.shiftsService.updateShift(req.user as any, Number(id), body);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Delete(':id')
  deleteShift(@Req() req: any, @Param('id') id: string) {
    return this.shiftsService.deleteShift(req.user as any, Number(id));
  }
}
